import { Request, Response } from 'express';
import { pool }              from '../config/db';
import { cloudinary }        from '../middleware/upload.middleware';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extrae el public_id de Cloudinary desde una URL segura.
 * Ej: https://res.cloudinary.com/demo/raw/upload/v1/biblioteca_virtual/pdfs/pdf_123.pdf
 *     → biblioteca_virtual/pdfs/pdf_123
 */
function extractPublicId(url: string, resourceType: 'image' | 'raw'): string | null {
  try {
    const pattern = resourceType === 'raw'
      ? /\/raw\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/
      : /\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** Elimina un archivo de Cloudinary de forma segura (no lanza si falla). */
async function deleteFromCloudinary(
  url: string | null,
  resourceType: 'image' | 'raw'
): Promise<void> {
  if (!url) return;
  const publicId = extractPublicId(url, resourceType);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn(`⚠️  No se pudo eliminar de Cloudinary (${publicId}):`, err);
  }
}

// ─── Controladores ──────────────────────────────────────────────────────────

export const getAllBooks = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, title, author, synopsis, publication_date,
              cover_url, pdf_url, created_at
       FROM books
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getAllBooks:', error);
    res.status(500).json({ message: 'Error al obtener libros' });
  }
};

export const getBookById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM books WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Libro no encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('getBookById:', error);
    res.status(500).json({ message: 'Error al obtener el libro' });
  }
};

export const createBook = async (req: Request, res: Response): Promise<void> => {
  const { title, author, synopsis, publication_date } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  // multer-storage-cloudinary guarda la URL de Cloudinary en file.path
  const pdfFile   = files?.pdf?.[0];
  const coverFile = files?.cover?.[0];

  if (!pdfFile) {
    res.status(400).json({ message: 'El PDF es obligatorio' });
    return;
  }

  const pdfUrl   = pdfFile.path;            // URL pública de Cloudinary
  const coverUrl = coverFile?.path ?? null;

  try {
    const result = await pool.query(
      `INSERT INTO books (title, author, synopsis, publication_date, cover_url, pdf_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, author, synopsis, publication_date, coverUrl, pdfUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Si falla la BD, eliminar los archivos ya subidos a Cloudinary
    await deleteFromCloudinary(pdfUrl,   'raw');
    await deleteFromCloudinary(coverUrl, 'image');
    console.error('createBook:', error);
    res.status(500).json({ message: 'Error al crear el libro' });
  }
};

export const updateBook = async (req: Request, res: Response): Promise<void> => {
  const { id }    = req.params;
  const { title, author, synopsis, publication_date } = req.body;
  const files     = req.files as { [fieldname: string]: Express.Multer.File[] };

  try {
    const existing = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ message: 'Libro no encontrado' });
      return;
    }

    const oldBook = existing.rows[0];
    const newPdfFile   = files?.pdf?.[0];
    const newCoverFile = files?.cover?.[0];

    // Usar la nueva URL si se subió un archivo nuevo; si no, mantener la anterior
    const pdfUrl   = newPdfFile   ? newPdfFile.path   : oldBook.pdf_url;
    const coverUrl = newCoverFile ? newCoverFile.path  : oldBook.cover_url;

    const result = await pool.query(
      `UPDATE books
       SET title=$1, author=$2, synopsis=$3, publication_date=$4,
           cover_url=$5, pdf_url=$6, updated_at=NOW()
       WHERE id=$7
       RETURNING *`,
      [title, author, synopsis, publication_date, coverUrl, pdfUrl, id]
    );

    // Eliminar archivos viejos de Cloudinary SOLO si se reemplazaron
    if (newPdfFile)   await deleteFromCloudinary(oldBook.pdf_url,   'raw');
    if (newCoverFile) await deleteFromCloudinary(oldBook.cover_url, 'image');

    res.json(result.rows[0]);
  } catch (error) {
    console.error('updateBook:', error);
    res.status(500).json({ message: 'Error al actualizar el libro' });
  }
};

export const deleteBook = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ message: 'Libro no encontrado' });
      return;
    }

    const book = existing.rows[0];

    // Eliminar de la BD primero
    await pool.query('DELETE FROM books WHERE id = $1', [id]);

    // Luego limpiar Cloudinary (no bloqueante para el response)
    await Promise.all([
      deleteFromCloudinary(book.pdf_url,   'raw'),
      deleteFromCloudinary(book.cover_url, 'image'),
    ]);

    res.json({ message: 'Libro eliminado correctamente' });
  } catch (error) {
    console.error('deleteBook:', error);
    res.status(500).json({ message: 'Error al eliminar el libro' });
  }
};

/**
 * Redirige al PDF almacenado en Cloudinary.
 * Para visualización inline usa la URL directa con fl_attachment=false.
 * Para descarga usa fl_attachment=true con el nombre del libro.
 */
export const getPDFUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT pdf_url, title FROM books WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Libro no encontrado' });
      return;
    }

    const { pdf_url, title } = result.rows[0];

    if (!pdf_url) {
      res.status(404).json({ message: 'PDF no disponible' });
      return;
    }

    const isDownload = req.query.download === 'true';

    if (isDownload) {
      // Para descarga: Cloudinary puede servir con fl_attachment
      const publicId = extractPublicId(pdf_url, 'raw');
      if (publicId) {
        const downloadUrl = cloudinary.url(publicId, {
          resource_type: 'raw',
          flags:         `attachment:${encodeURIComponent(title)}.pdf`,
        });
        res.redirect(downloadUrl);
      } else {
        res.redirect(pdf_url);
      }
    } else {
      // Para visualización: redirige directo a la URL pública de Cloudinary
      res.redirect(pdf_url);
    }
  } catch (error) {
    console.error('getPDFUrl:', error);
    res.status(500).json({ message: 'Error al obtener el PDF' });
  }
};