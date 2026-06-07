import { Router } from 'express';
import {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getPDFUrl,
} from '../controllers/books.controller';
import { verifyToken } from '../middleware/auh.middleware';
import { upload }      from '../middleware/upload.middleware';

const router = Router();

// ── Rutas públicas ───────────────────────────────────────────────────────────
router.get('/',         getAllBooks);
router.get('/:id',      getBookById);
router.get('/:id/pdf',  getPDFUrl);   // ?download=true para descargar

// ── Rutas protegidas (requieren JWT) ─────────────────────────────────────────
router.post(
  '/',
  verifyToken,
  upload.fields([
    { name: 'pdf',   maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  createBook
);

router.put(
  '/:id',
  verifyToken,
  upload.fields([
    { name: 'pdf',   maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  updateBook
);

router.delete('/:id', verifyToken, deleteBook);

export default router;