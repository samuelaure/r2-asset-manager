import { JSONFilePreset } from 'lowdb/node';
import { config } from './config.js';

const defaultData = { projects: {}, projectConfig: {} };

export async function getManifest() {
    const db = await JSONFilePreset(config.manifestFile, defaultData);
    return db;
}

export async function getProjectConfig(db, projectName) {
    return db.data.projectConfig[projectName] || null;
}

export async function setProjectConfig(db, projectName, configData) {
    db.data.projectConfig[projectName] = {
        shortCode: configData.shortCode.toUpperCase(),
        counter: configData.counter || 0
    };
    await db.write();
}

export async function addAsset(db, projectName, assetData) {
    if (!db.data.projects[projectName]) {
        db.data.projects[projectName] = [];
    }

    // Increment counter for the project
    db.data.projectConfig[projectName].counter += 1;
    const currentCounter = db.data.projectConfig[projectName].counter;

    const entry = {
        system_filename: assetData.system_filename,
        original_filename: assetData.original_filename,
        hash: assetData.hash,
        r2_key: assetData.r2_key,
        size: assetData.size,
        counter: currentCounter,
        uploaded_at: new Date().toISOString(),
        status: 'active',
    };

    db.data.projects[projectName].push(entry);
    await db.write();
    return entry;
}

export function findAssetByHash(db, projectName, hash) {
    const projectAssets = db.data.projects[projectName] || [];
    return projectAssets.find(asset => asset.hash === hash);
}
