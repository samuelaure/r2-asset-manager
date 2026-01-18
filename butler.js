#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import path from 'fs';
import fsPromises from 'fs/promises';
import { validateConfig, config } from './src/config.js';
import {
  getManifest,
  addAsset,
  findAssetByHash,
  getProjectConfig,
  setProjectConfig,
} from './src/manifest.js';
import { getFileHash, formatSize } from './src/utils.js';
import { compressVideo, compressAudio } from './src/ffmpeg.js';
import { uploadToR2, deleteR2Object } from './src/sync.js';
import pathModule from 'path';
import os from 'os';

const program = new Command();

const VIDEO_EXTENSIONS = /\.(mp4|mov|avi|mkv)$/i;
const AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|aac|ogg)$/i;

program
  .name('butler')
  .description('R2 Media Butler - Process and Sync media assets')
  .version('0.1.3');

program
  .command('sync')
  .description('Process and upload local media (video/audio) to R2')
  .option('-p, --project <name>', 'Project/Namespace name')
  .option('-d, --dir <path>', 'Local directory with media')
  .option('--skip-size-check', 'Skip large file size confirmation', false)
  .action(async (options) => {
    try {
      validateConfig();

      let { project, dir, skipSizeCheck } = options;

      // Interactive selection if not provided
      if (!project) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'project',
            message: 'Enter project/namespace name:',
            validate: (input) => input.length > 0 || 'Project name is required',
          },
        ]);
        project = answers.project;
      }

      if (!dir) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'dir',
            message: 'Enter local directory path:',
            default: '.',
            validate: (input) => path.existsSync(input) || 'Directory does not exist',
          },
        ]);
        dir = answers.dir;
      }

      const db = await getManifest();

      // --- Project Naming Setup ---
      let projectConfig = await getProjectConfig(db, project);
      if (!projectConfig) {
        console.log(`\nNew project detected: ${project}`);

        const suggestions = [
          project.substring(0, 2).toUpperCase(),
          project.substring(0, 3).toUpperCase(),
          project
            .split('_')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 3),
        ].filter((v, i, a) => a.indexOf(v) === i);

        const setupAnswers = await inquirer.prompt([
          {
            type: 'list',
            name: 'shortCodeOption',
            message: 'Choose a short-code for this project or enter a custom one:',
            choices: [...suggestions, 'Custom'],
          },
          {
            type: 'input',
            name: 'customShortCode',
            message: 'Enter custom short-code (max 4 chars):',
            when: (answers) => answers.shortCodeOption === 'Custom',
            validate: (input) =>
              (input.length > 0 && input.length <= 4) || 'Short-code must be 1-4 characters',
          },
        ]);

        const shortCode =
          setupAnswers.shortCodeOption === 'Custom'
            ? setupAnswers.customShortCode
            : setupAnswers.shortCodeOption;

        await setProjectConfig(db, project, { shortCode, videoCounter: 0, audioCounter: 0 });
        projectConfig = await getProjectConfig(db, project);
        console.log(`Project initialized with short-code: ${shortCode}\n`);
      }

      const absoluteDir = pathModule.resolve(dir);
      const files = await fsPromises.readdir(absoluteDir);
      const mediaFiles = files.filter((f) => VIDEO_EXTENSIONS.test(f) || AUDIO_EXTENSIONS.test(f));

      if (mediaFiles.length === 0) {
        console.log('No video or audio files found in directory.');
        return;
      }

      console.log(
        `Found ${mediaFiles.length} media assets. Starting Butler service for project: ${project}`
      );

      for (const fileName of mediaFiles) {
        const filePath = pathModule.join(absoluteDir, fileName);
        const fileStats = await fsPromises.stat(filePath);
        const isVideo = VIDEO_EXTENSIONS.test(fileName);
        const typeCode = isVideo ? 'VID' : 'AUD';
        const folderName = isVideo ? 'videos' : 'audios';

        console.log(`\n--- Evaluating [${typeCode}]: ${fileName} ---`);

        // --- Size Filtering Logic ---
        const sizeMB = fileStats.size / (1024 * 1024);
        const limitMB = isVideo ? config.limits.videoMaxMB : config.limits.audioMaxMB;

        if (!skipSizeCheck && sizeMB > limitMB) {
          console.warn(`⚠️  WARNING: File size exceeds typical limits!`);
          console.warn(`   File: ${fileName}`);
          console.warn(`   Size: ${formatSize(fileStats.size)} (Limit: ${limitMB} MB)`);

          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `This file is unusually large. Do you still want to process and upload it?`,
              default: false,
            },
          ]);

          if (!confirm) {
            console.log(`⏭️  Skipping: ${fileName}`);
            continue;
          }
        }

        // 1. Hash
        console.log('Calculating hash...');
        const hash = await getFileHash(filePath);

        // 2. Deduplication
        const existing = findAssetByHash(db, project, hash);
        if (existing) {
          console.log(
            `Skipping: File already exists in project '${project}' as ${existing.system_filename} (Original: ${existing.original_filename})`
          );
          console.log('Cleaning up local copy (already synced)...');
          await fsPromises.unlink(filePath);
          continue;
        }

        // 3. Increment Name Generation
        const currentCounter = isVideo ? projectConfig.videoCounter : projectConfig.audioCounter;
        const nextCounter = currentCounter + 1;
        const paddedCounter = String(nextCounter).padStart(4, '0');
        const extension = isVideo ? '.mp4' : '.m4a';
        const systemFileName = `${projectConfig.shortCode}_${typeCode}_${paddedCounter}${extension}`;

        // 4. Compress/Optimize
        const tempPath = pathModule.join(os.tmpdir(), `butler_${hash}_${systemFileName}`);
        if (isVideo) {
          console.log(`Compressing video to: ${systemFileName}...`);
          await compressVideo(filePath, tempPath);
        } else {
          console.log(`Optimizing audio to: ${systemFileName}...`);
          await compressAudio(filePath, tempPath);
        }

        // 5. Upload
        const r2Key = `${project}/${folderName}/${systemFileName}`;
        console.log(`Uploading to R2: ${r2Key}...`);
        await uploadToR2(tempPath, r2Key);

        // 6. Record in manifest
        console.log('Recording in manifest...');
        await addAsset(db, project, typeCode, {
          system_filename: systemFileName,
          original_filename: fileName,
          hash: hash,
          r2_key: r2Key,
          size: (await fsPromises.stat(tempPath)).size,
        });

        // Refresh config ref
        projectConfig = await getProjectConfig(db, project);

        // 7. Cleanup
        console.log('Cleaning up local files...');
        await fsPromises.unlink(tempPath);
        await fsPromises.unlink(filePath);

        console.log(`Finished: ${systemFileName}`);
      }

      console.log('\nAll assets processed successfully.');
    } catch (error) {
      console.error('Fatal Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('rotate')
  .description('Rotate old assets from R2 for a specific project')
  .requiredOption('-p, --project <name>', 'Project/Namespace name')
  .option('--older-than <days>', 'Delete assets older than X days', '90')
  .option('--dry-run', 'List assets that would be deleted without deleting them', false)
  .action(async (options) => {
    try {
      validateConfig();
      const { project, olderThan, dryRun } = options;
      const days = parseInt(olderThan);

      if (isNaN(days)) {
        throw new Error('older-than must be a number (days)');
      }

      const db = await getManifest();
      const projectAssets = db.data.projects[project];

      if (!projectAssets || projectAssets.length === 0) {
        console.log(`No assets found for project '${project}'.`);
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      console.log(
        `Rotating assets for '${project}' older than ${days} days (Cutoff: ${cutoffDate.toISOString()})`
      );
      if (dryRun) console.log('*** DRY RUN MODE - No files will be deleted ***');

      let count = 0;
      const updatedAssets = [];

      for (const asset of projectAssets) {
        const uploadDate = new Date(asset.uploaded_at);

        if (asset.status === 'active' && uploadDate < cutoffDate) {
          console.log(
            `[Target] [${asset.type}] ${asset.system_filename} (Original: ${asset.original_filename}, Uploaded: ${asset.uploaded_at})`
          );

          if (!dryRun) {
            try {
              console.log(`Deleting from R2: ${asset.r2_key}...`);
              await deleteR2Object(asset.r2_key);
              asset.status = 'archived';
              asset.deleted_at = new Date().toISOString();
              count++;
            } catch (err) {
              console.error(`Failed to delete ${asset.system_filename}: ${err.message}`);
            }
          } else {
            count++;
          }
        }
        updatedAssets.push(asset);
      }

      if (!dryRun && count > 0) {
        db.data.projects[project] = updatedAssets;
        await db.write();
        console.log(`\nSuccessfully rotated ${count} assets.`);
      } else if (dryRun) {
        console.log(`\nDry run finished. ${count} assets would be affected.`);
      } else {
        console.log('\nNo assets met the rotation criteria.');
      }
    } catch (error) {
      console.error('Fatal Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
