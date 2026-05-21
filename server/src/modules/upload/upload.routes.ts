import express, { Request, Response, Router } from 'express';
import path from 'path';
import fs from 'fs';
import { sendSuccess } from '@/utils/response';
import { logger } from '@/utils/logger';
import { authenticate, authorize } from '@/middleware/auth';
import { createError } from '@/utils';

const router: Router = express.Router();
const serverRoot = path.resolve(__dirname, '..', '..', '..');
const repoRoot = path.resolve(serverRoot, '..');
const uploadPathEnv = process.env.UPLOAD_PATH || 'uploads';
const uploadsDirPrimary = path.isAbsolute(uploadPathEnv)
  ? uploadPathEnv
  : path.join(serverRoot, uploadPathEnv);
const uploadsDirFallback = path.isAbsolute(uploadPathEnv)
  ? uploadPathEnv
  : path.join(repoRoot, uploadPathEnv);

const MAX_BYTES = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB default
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

const UPLOAD_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'BRANCH_MANAGER',
  'CHEF',
  'WAITER',
] as const;

function detectMimeFromBase64Header(dataUrl: string): string | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(dataUrl);
  return match ? match[1].toLowerCase() : null;
}

function extensionForMime(mime: string): string {
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  return '.jpg';
}

router.post(
  '/upload',
  authenticate,
  authorize(...UPLOAD_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { image, filename, mimeType } = req.body as {
        image?: string;
        filename?: string;
        mimeType?: string;
      };

      if (!image || typeof image !== 'string') {
        throw createError('No image data provided', 400);
      }

      const detectedMime = detectMimeFromBase64Header(image);
      const resolvedMime = (detectedMime || mimeType || '').toLowerCase();
      if (!resolvedMime || !ALLOWED_MIME.has(resolvedMime)) {
        throw createError('Invalid file type. Allowed: JPEG, PNG, WebP, GIF', 400);
      }

      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      let buffer: Buffer;
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch {
        throw createError('Invalid image encoding', 400);
      }

      if (buffer.length === 0) {
        throw createError('Empty image data', 400);
      }
      if (buffer.length > MAX_BYTES) {
        throw createError(`Image too large. Max ${Math.round(MAX_BYTES / 1024 / 1024)}MB`, 400);
      }

      if (!fs.existsSync(uploadsDirPrimary)) {
        fs.mkdirSync(uploadsDirPrimary, { recursive: true });
      }

      const safeBase =
        typeof filename === 'string'
          ? path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
          : 'upload';
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extensionForMime(resolvedMime);
      const finalFilename = `${uniqueSuffix}-${safeBase}${ext}`.replace(/\.+/g, '.');
      const filePath = path.join(uploadsDirPrimary, finalFilename);

      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${finalFilename}`;
      return sendSuccess(
        res,
        {
          url: fileUrl,
          filename: finalFilename,
          size: buffer.length,
        },
        'File uploaded successfully'
      );
    } catch (error) {
      logger.error('Upload error:', error);
      if ((error as { statusCode?: number }).statusCode) {
        throw error;
      }
      return res.status(500).json({
        success: false,
        message: 'Upload failed',
      });
    }
  }
);

router.use('/uploads', express.static(uploadsDirPrimary), express.static(uploadsDirFallback));

export default router;
