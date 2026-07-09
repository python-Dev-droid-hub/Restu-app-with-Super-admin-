import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ISuperAdminRequest } from '@/superadmin/types';
import { asyncHandler, sendSuccess, createError } from '@/utils';

const serverRoot = path.resolve(__dirname, '..', '..', '..');
const uploadsDir = path.join(serverRoot, process.env.UPLOAD_PATH || 'uploads', 'superadmin');

export const uploadImage = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { image, filename } = req.body as { image?: string; filename?: string };
  if (!image || !image.startsWith('data:image/')) {
    throw createError('Valid base64 image required.', 400);
  }

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(image);
  if (!match) throw createError('Invalid image format.', 400);

  const ext = match[1].includes('png') ? '.png' : match[1].includes('webp') ? '.webp' : '.jpg';
  const name = `${Date.now()}-${(filename || 'logo').replace(/[^a-z0-9.-]/gi, '')}${ext}`;
  const filePath = path.join(uploadsDir, name);
  fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));

  const baseUrl = process.env.SERVER_URL || 'http://localhost:3101';
  const url = `${baseUrl.replace(/\/$/, '')}/uploads/superadmin/${name}`;

  sendSuccess(res, { url }, 'Image uploaded');
});
