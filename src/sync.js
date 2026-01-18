import { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import { getS3Client } from './s3.js';
import { config } from './config.js';

/**
 * Uploads a file to R2 using multipart upload for stability.
 * @param {string} filePath 
 * @param {string} key 
 * @returns {Promise<string>} The ETag of the uploaded object
 */
export async function uploadToR2(filePath, key) {
    const client = getS3Client();
    const fileStream = fs.createReadStream(filePath);

    const upload = new Upload({
        client,
        params: {
            Bucket: config.r2.bucket,
            Key: key,
            Body: fileStream,
            ContentType: 'video/mp4',
        },
    });

    const result = await upload.done();
    // R2 ETags are usually wrapped in quotes
    return result.ETag ? result.ETag.replace(/"/g, '') : null;
}

/**
 * Checks if a file exists in R2 and returns its metadata
 * @param {string} key 
 * @returns {Promise<Object|null>}
 */
export async function getR2ObjectMetadata(key) {
    const client = getS3Client();
    try {
        const command = new HeadObjectCommand({
            Bucket: config.r2.bucket,
            Key: key,
        });
        const response = await client.send(command);
        return response;
    } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return null;
        }
        throw error;
    }
}
/**
 * Deletes an object from R2
 * @param {string} key 
 * @returns {Promise<void>}
 */
export async function deleteR2Object(key) {
    const client = getS3Client();
    const command = new DeleteObjectCommand({
        Bucket: config.r2.bucket,
        Key: key,
    });
    await client.send(command);
}
