import ffmpeg from 'fluent-ffmpeg';
import { config } from './config.js';

if (config.ffmpegPath) {
    ffmpeg.setFfmpegPath(config.ffmpegPath);
}

/**
 * Compresses a video file to H.264, CRF 24, AAC, keeping height <= 1080p.
 * @param {string} inputPath 
 * @param {string} outputPath 
 * @returns {Promise<void>}
 */
export function compressVideo(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-c:v libx264',
                '-crf 24',
                '-preset medium',
                '-c:a aac',
                '-b:a 128k',
                '-pix_fmt yuv420p'
            ])
            // Simplified and quoted scaling to avoid "Filter not found" errors
            .videoFilters([
                "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
                "pad='ceil(iw/2)*2':'ceil(ih/2)*2'" // Ensures dimensions are even (required for libx264)
            ])
            .on('start', (commandLine) => {
                console.log('Spawned Ffmpeg (video) with command: ' + commandLine);
            })
            .on('error', (err) => {
                console.error('An error occurred: ' + err.message);
                reject(err);
            })
            .on('end', () => {
                console.log('Compression finished !');
                resolve();
            })
            .save(outputPath);
    });
}

/**
 * Compresses an audio file to AAC, 128k.
 * @param {string} inputPath 
 * @param {string} outputPath 
 * @returns {Promise<void>}
 */
export function compressAudio(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-c:a aac',
                '-b:a 128k'
            ])
            .on('start', (commandLine) => {
                console.log('Spawned Ffmpeg (audio) with command: ' + commandLine);
            })
            .on('error', (err) => {
                console.error('An audio error occurred: ' + err.message);
                reject(err);
            })
            .on('end', () => {
                console.log('Audio processing finished !');
                resolve();
            })
            .save(outputPath);
    });
}

/**
 * Probe video/audio metadata
 * @param {string} filePath 
 * @returns {Promise<ffmpeg.FfprobeData>}
 */
export function probeVideo(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata);
        });
    });
}
