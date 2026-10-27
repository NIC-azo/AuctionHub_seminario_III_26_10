import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../utils/http-error.js';

const allowedImageTypes = new Map([
  ['image/jpeg', { extension: '.jpg', signature: (buffer: Buffer) =>
    buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
  ['image/png', { extension: '.png', signature: (buffer: Buffer) =>
    buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ['image/webp', { extension: '.webp', signature: (buffer: Buffer) =>
    buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' }],
]);

let s3Client: S3Client | undefined;

function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKeyId = process.env.MINIO_ACCESS_KEY ?? process.env.MINIO_ROOT_USER;
  const secretAccessKey = process.env.MINIO_SECRET_KEY ?? process.env.MINIO_ROOT_PASSWORD;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'MINIO_ENDPOINT and MinIO access credentials must be configured for image uploads.',
    );
  }

  s3Client = new S3Client({
    endpoint,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  return s3Client;
}

function getBucketName(): string {
  const bucket = process.env.MINIO_BUCKET;
  if (!bucket) {
    throw new Error('MINIO_BUCKET must be configured for image uploads.');
  }
  return bucket;
}

export interface StoredProductImage {
  key: string;
  url: string;
}

export async function uploadProductImage(file: Express.Multer.File): Promise<StoredProductImage> {
  const imageType = allowedImageTypes.get(file.mimetype);
  if (!imageType || !imageType.signature(file.buffer)) {
    throw new HttpError(
      400,
      'INVALID_IMAGE',
      'The uploaded file must be a valid JPEG, PNG, or WebP image.',
    );
  }

  const bucket = getBucketName();
  const key = `products/${randomUUID()}${imageType.extension}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentLength: file.size,
      ContentType: file.mimetype,
    }),
  );

  const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT ?? 'http://localhost:9000';
  const url = `${publicEndpoint.replace(/\/+$/, '')}/${encodeURIComponent(bucket)}/${key
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

  return { key, url };
}

export async function deleteProductImage(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }),
  );
}
