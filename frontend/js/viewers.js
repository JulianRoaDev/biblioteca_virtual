const API = 'https://biblioteca-virtual-kos6.onrender.com/api';

const token    = localStorage.getItem('token');
const isLogged = !!token;

const params = new URLSearchParams(window.location.search);
const bookId = params.get('id');

if (!bookId) {
  window.location.href = 'dashboard.html';
}

// ─── Navbar dinámica ─────────────────────────────────────────────────────────

const sessionBtn = document.getElementById('session-btn');

if (sessionBtn) {
  if (isLogged) {
    sessionBtn.textContent = 'Cerrar Sesión';
    sessionBtn.classList.add('btn-outline');
    sessionBtn.addEventListener('click', () => {
      localStorage.clear();
      // ✅ Fix 3: cerrar sesión redirige al dashboard
      window.location.href = 'dashboard.html';
    });
  } else {
    sessionBtn.textContent = 'Iniciar Sesión';
    sessionBtn.classList.add('btn-primary');
    sessionBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }
}

// Menú hamburguesa
const toggle = document.getElementById('nav-toggle');
if (toggle) {
  toggle.addEventListener('click', () =>
    document.querySelector('.nav-links')?.classList.toggle('open')
  );
}

// ─── Cargar datos del libro ───────────────────────────────────────────────────

fetch(`${API}/books/${bookId}`)
  .then(res => {
    if (!res.ok) throw new Error('Libro no encontrado');
    return res.json();
  })
  .then(book => {
    document.title = `${book.title} — Biblioteca Virtual`;
    document.getElementById('book-title').textContent  = book.title;
    document.getElementById('book-author').textContent = `✍️ ${book.author}`;
    document.getElementById('book-synopsis').textContent =
      book.synopsis || 'Sin sinopsis disponible.';
    document.getElementById('book-date').textContent = book.publication_date
      ? `📅 Publicado: ${new Date(book.publication_date).toLocaleDateString('es-CO')}`
      : '';

    // El redirect del backend puede fallar en iframes por políticas del navegador.
    // Cloudinary devuelve una URL pública directa — el iframe la carga sin problemas.
    const pdfUrl = book.pdf_url; // URL directa de Cloudinary guardada en BD

    if (!pdfUrl) {
      showFallback(null);
      return;
    }

    const iframe = document.getElementById('pdf-iframe');
    iframe.src = pdfUrl;

    // ─── Botón de descarga ────────────────────────────────────────────────
    // Usar el endpoint del backend con ?download=true para que Cloudinary
    // sirva con fl_attachment y el nombre correcto del libro
    const dlBtn = document.getElementById('download-btn');
    if (dlBtn) {
      dlBtn.href   = `${API}/books/${bookId}/pdf?download=true`;
      dlBtn.target = '_blank';
    }
  })
  .catch(err => {
    console.error(err);
    document.getElementById('book-title').textContent  = 'Error al cargar el libro';
    document.getElementById('book-author').textContent = '';
    showFallback(null);
  });

// ─── Fallback ────────────────────────────────────────────────────────────────

function showFallback(pdfUrl) {
  const wrapper = document.querySelector('.pdf-viewer-wrapper');
  if (!wrapper) return;

  wrapper.innerHTML = pdfUrl
    ? `<div style="padding:2.5rem;text-align:center;color:var(--text-muted)">
        <p style="font-size:1.1rem;margin-bottom:1.2rem">
          Tu navegador no puede mostrar el PDF en línea.
        </p>
        <a href="${pdfUrl}" target="_blank" class="btn btn-primary">
          📄 Abrir PDF en nueva pestaña
        </a>
      </div>`
    : `<div style="padding:2.5rem;text-align:center;color:var(--text-muted)">
        <p>No hay PDF disponible para este libro.</p>
      </div>`;
}