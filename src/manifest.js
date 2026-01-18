import { JSONFilePreset } from 'lowdb/node';
import { config } from './config.js';

const defaultData = { projects: {} };

export async function getManifest() {
    const db = await JSONFilePreset(config.manifestFile, defaultData);
    return db;
}

export async function addAsset(db, projectName, assetData) {
    if (!db.data.projects[projectName]) {
        db.data.projects[projectName] = [];
    }
    db.data.projects[projectName].push({
        ...assetData,
        uploaded_at: new Date().toISOString(),
        status: 'active',
    });
    await db.write();
}

export function findAssetByHash(db, projectName, hash) {
    const projectAssets = db.data.projects[projectName] || [];
    return projectAssets.find(asset => asset.hash === hash);
}
