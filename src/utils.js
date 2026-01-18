import crypto from 'crypto';
import fs from 'fs';

/**
 * Generates a SHA-256 hash of a file.
 * @param {string} filePath 
 * @returns {Promise<string>}
 */
export function getFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', err => reject(err));
    });
}

/**
 * Formats bytes into human readable string.
 * @param {number} bytes 
 * @returns {string}
 */
export function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
