import { S3Client } from '@aws-sdk/client-s3';
import { config } from './config.js';

let client = null;

export function getS3Client() {
  if (client) return client;

  client = new S3Client({
    region: 'auto',
    endpoint: config.r2.endpoint,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  });

  return client;
}
