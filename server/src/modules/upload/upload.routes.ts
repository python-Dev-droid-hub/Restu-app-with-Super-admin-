import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendSuccess } from '@/utils/response';
import { logger } from '@/utils/logger';

const router: Router = express.Router();
const uploadsDir = path.isAbsolute(process.env.UPLOAD_PATH || '')
  ? (process.env.UPLOAD_PATH as string)
  : path.join(process.cwd(), process.env.UPLOAD_PATH || 'uploads');

// Upload base64 image
router.post('/upload', async (req: Request, res: Response) => {
  console.log('🔍 [UPLOAD DEBUG] Base64 upload request received');
  console.log('🔍 [UPLOAD DEBUG] Body keys:', Object.keys(req.body || {}));
  
  try {
    const { image, filename, mimeType } = req.body;
    
    if (!image) {
      console.log('🔍 [UPLOAD DEBUG] No image data in request');
      return res.status(400).json({
        success: false,
        message: 'No image data provided'
      });
    }

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const finalFilename = filename ? 
      uniqueSuffix + '-' + filename : 
      'category-' + uniqueSuffix + '.jpg';
    const filePath = path.join(uploadsDir, finalFilename);

    // Convert base64 to buffer and save
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    fs.writeFileSync(filePath, buffer);
    
    // Return the file URL
    const fileUrl = `/uploads/${finalFilename}`;
    console.log('🔍 [UPLOAD DEBUG] Base64 file saved successfully:', fileUrl);

    return sendSuccess(res, {
      url: fileUrl,
      filename: finalFilename,
      size: buffer.length
    }, 'File uploaded successfully');
  } catch (error) {
    console.log('🔍 [UPLOAD DEBUG] Base64 upload error:', error);
    logger.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Upload failed'
    });
  }
});

// Serve uploaded files
router.use('/uploads', express.static(uploadsDir));

export default router;
