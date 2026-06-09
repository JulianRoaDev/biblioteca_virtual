const API = 'https://biblioteca-virtual-kos6.onrender.com'; // En producción: tu URL de Render

// Verificar sesión
if (!localStorage.getItem('token')) {
  window.location.href = 'login.html';
}

const params = new URLSearchParams(window.location.search);
const bookId = params.get('id');

if (!bookId) {
  window.location.href = 'books.html';
}

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

// Menú hamburguesa
const toggle = document.getElementById('nav-toggle');
if (toggle) {
  toggle.addEventListener('click', () =>
    document.querySelector('.nav-links').classList.toggle('open')
  );
}

// ── Cargar libro ─────────────────────────────────────────────────────────────
fetch(`${API}/books/${bookId}`)
  .then(res => {
    if (!res.ok) throw new Error('Libro no encontrado');
    return res.json();
  })
  .then(book => {
    document.title = `${book.title} — Biblioteca Virtual`;
    document.getElementById('book-title').textContent = book.title;
    document.getElementById('book-author').textContent = `✍️ ${book.author}`;
    document.getElementById('book-synopsis').textContent =
      book.synopsis || 'Sin sinopsis disponible.';
    document.getElementById('book-date').textContent = book.publication_date
      ? `📅 Publicado: ${new Date(book.publication_date).toLocaleDateString('es-CO')}`
      : '';

    // ── Visor PDF ──────────────────────────────────────────────────────────
    // Los PDFs en Cloudinary son URLs públicas directas — el iframe los carga sin problemas
    // Usamos el endpoint /pdf del backend que redirige a Cloudinary,
    // así no exponemos la URL de Cloudinary directamente en el frontend.
    const pdfViewUrl     = `${API}/books/${bookId}/pdf`;
    const pdfDownloadUrl = `${API}/books/${bookId}/pdf?download=true`;

    const iframe = document.getElementById('pdf-iframe');
    iframe.src = pdfViewUrl;

    // Si el iframe falla (navegadores móviles con restricciones),
    // mostrar enlace de fallback
    iframe.onerror = () => showFallback(pdfViewUrl);
    iframe.addEventListener('load', () => {
      // Verificar que el iframe cargó correctamente
      try {
        if (iframe.contentDocument?.body?.innerHTML === '') {
          showFallback(pdfViewUrl);
        }
      } catch {
        // Cross-origin — significa que cargó bien (no mismo origen = Cloudinary sirvió el PDF)
      }
    });

    // ── Botón descargar ────────────────────────────────────────────────────
    const dlBtn = document.getElementById('download-btn');
    dlBtn.href   = pdfDownloadUrl;
    dlBtn.target = '_blank';
    dlBtn.removeAttribute('download'); // La descarga la maneja Cloudinary vía fl_attachment
  })
  .catch(err => {
    console.error(err);
    document.getElementById('book-title').textContent = 'Error al cargar el libro';
    document.getElementById('book-author').textContent = '';
  });

// ── Fallback si el iframe no puede mostrar el PDF ─────────────────────────────
function showFallback(pdfUrl) {
  const wrapper = document.querySelector('.pdf-viewer-wrapper');
  wrapper.innerHTML = `
    <div style="padding:2rem;text-align:center;color:var(--text-muted)">
      <p style="font-size:1.1rem;margin-bottom:1rem">
        Tu navegador no puede mostrar el PDF directamente.
      </p>
      <a href="${pdfUrl}" target="_blank" class="btn btn-primary">
        📄 Abrir PDF en nueva pestaña
      </a>
    </div>
  `;
}