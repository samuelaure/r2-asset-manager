import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  r2: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    endpoint: process.env.R2_ENDPOINT,
    bucket: process.env.R2_BUCKET_NAME,
  },
  ffmpegPath: process.env.FFMPEG_PATH || null,
  manifestFile: path.join(process.cwd(), 'manifest.json'),
  limits: {
    videoMaxMB: parseInt(process.env.MAX_VIDEO_SIZE_MB || '500'),
    audioMaxMB: parseInt(process.env.MAX_AUDIO_SIZE_MB || '50'),
  }
};

export function validateConfig() {
  const missing = [];
  if (!config.r2.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!config.r2.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!config.r2.endpoint) missing.push('R2_ENDPOINT');
  if (!config.r2.bucket) missing.push('R2_BUCKET_NAME');

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}
