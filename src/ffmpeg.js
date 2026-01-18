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
            .videoFilters([
                {
                    filter: 'scale',
                    options: 'iw*min(1\,1920/iw):ih*min(1\,1080/ih)' // Scale down to 1080p if larger, else keep size
                }
            ])
            .on('start', (commandLine) => {
                console.log('Spawned Ffmpeg with command: ' + commandLine);
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
 * Probe video metadata
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
