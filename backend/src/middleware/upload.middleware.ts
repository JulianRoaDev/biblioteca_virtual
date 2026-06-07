import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Configuración global de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Storage para PDFs
const pdfStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder:        'biblioteca_virtual/pdfs',
    resource_type: 'raw',                          // 'raw' es obligatorio para PDFs
    public_id:     `pdf_${Date.now()}_${file.originalname.replace(/\s+/g, '_').replace(/\.pdf$/i, '')}`,
    format:        'pdf',
  }),
});

// Storage para imágenes de portada
const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    return {
      folder:        'biblioteca_virtual/covers',
      resource_type: 'image',
      public_id:     `cover_${Date.now()}`,
      format:        ext,
      transformation: [
        { width: 400, height: 560, crop: 'fill', gravity: 'center' }, // Proporción portada de libro
      ],
    };
  },
});

// Filtro de archivos
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.fieldname === 'pdf') {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF'));
    }
  }
  if (file.fieldname === 'cover') {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes para la portada'));
    }
  }
  cb(null, true);
};

// Storage combinado que elige según el campo
const combinedStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    if (file.fieldname === 'pdf') {
      return {
        folder:        'biblioteca_virtual/pdfs',
        resource_type: 'raw',
        public_id:     `pdf_${Date.now()}_${file.originalname.replace(/\s+/g, '_').replace(/\.pdf$/i, '')}`,
        format:        'pdf',
      };
    }
    // cover
    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    return {
      folder:        'biblioteca_virtual/covers',
      resource_type: 'image',
      public_id:     `cover_${Date.now()}`,
      format:        ext,
      transformation: [
        { width: 400, height: 560, crop: 'fill', gravity: 'center' },
      ],
    };
  },
});

export const upload = multer({
  storage:    combinedStorage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB máximo
});

// Exportar cloudinary para usarlo en el controlador (eliminar archivos)
export { cloudinary };