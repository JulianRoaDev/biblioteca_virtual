const API = 'https://biblioteca-virtual-kos6.onrender.com/api';

// ─── Estado de sesión ────────────────────────────────────────────────────────

const token     = localStorage.getItem('token');
const adminName = localStorage.getItem('adminName');
const isLogged  = !!token;

// ─── Navbar dinámica ─────────────────────────────────────────────────────────

const sessionBtn  = document.getElementById('session-btn');
const authOnlyEls = document.querySelectorAll('.nav-auth-only');

if (isLogged) {
  authOnlyEls.forEach(el => el.classList.remove('hidden'));

  sessionBtn.textContent = 'Cerrar Sesión';
  sessionBtn.classList.remove('btn-primary');
  sessionBtn.classList.add('btn-outline');
  sessionBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'dashboard.html';
  });

  document.getElementById('hero-title').textContent =
    `Bienvenido, ${adminName || 'Administrador'} 👋`;
  document.getElementById('hero-subtitle').textContent =
    'Gestiona tu colección de libros digitales desde este panel.';

  document.getElementById('stats-section').classList.remove('hidden');

} else {
  sessionBtn.textContent = 'Iniciar Sesión';
  sessionBtn.classList.remove('btn-outline');
  sessionBtn.classList.add('btn-primary');
  sessionBtn.addEventListener('click', () => {
    window.location.href = 'login.html';
  });

  document.getElementById('guest-banner').classList.remove('hidden');
}

// ─── Menú hamburguesa ────────────────────────────────────────────────────────

document.getElementById('nav-toggle').addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('open');
});

// ─── Carga y búsqueda de libros ──────────────────────────────────────────────

let allBooks = [];

async function loadBooks() {
  const statusEl  = document.getElementById('books-status');
  const noResults = document.getElementById('no-results');

  try {
    const res = await fetch(`${API}/books`);
    if (!res.ok) throw new Error('Error del servidor');

    allBooks = await res.json();
    statusEl.classList.add('hidden');

    if (allBooks.length === 0) {
      noResults.classList.remove('hidden');
      noResults.querySelector('p').textContent = 'Aún no hay libros en la biblioteca.';
      return;
    }

    if (isLogged) {
      document.getElementById('total-books').textContent = allBooks.length;
      const now       = new Date();
      const thisMonth = allBooks.filter(b => {
        const d = new Date(b.created_at);
        return d.getMonth() === now.getMonth() &&
               d.getFullYear() === now.getFullYear();
      });
      document.getElementById('recent-books').textContent = thisMonth.length;
    }

    renderBooks(allBooks);

  } catch (err) {
    console.error(err);
    statusEl.textContent = '⚠️ No se pudo conectar con el servidor. Intenta más tarde.';
  }
}

function renderBooks(books) {
  const gridEl    = document.getElementById('books-grid');
  const noResults = document.getElementById('no-results');

  if (books.length === 0) {
    gridEl.innerHTML = '';
    noResults.classList.remove('hidden');
    return;
  }

  noResults.classList.add('hidden');
  gridEl.innerHTML = books.map(bookCard).join('');
}

function bookCard(b) {
  // ✅ Fix 1: todos pueden ver el visor sin necesidad de login
  const coverContent = b.cover_url
    ? `<img src="${b.cover_url}" alt="Portada de ${b.title}" />`
    : '📖';

  const dateStr = b.publication_date
    ? new Date(b.publication_date).getFullYear()
    : '';

  return `
    <div class="book-card" onclick="window.location.href='viewer.html?id=${b.id}'">
      <div class="book-card-cover">${coverContent}</div>
      <div class="book-card-body">
        <p class="book-card-title">${b.title}</p>
        <p class="book-card-author">${b.author}</p>
        ${dateStr ? `<p class="book-card-year">${dateStr}</p>` : ''}
      </div>
    </div>`;
}

// ─── Buscador en tiempo real ──────────────────────────────────────────────────

document.getElementById('search-input').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { renderBooks(allBooks); return; }

  const filtered = allBooks.filter(b =>
    b.title.toLowerCase().includes(q)  ||
    b.author.toLowerCase().includes(q) ||
    (b.synopsis && b.synopsis.toLowerCase().includes(q))
  );

  renderBooks(filtered);
});

// ─── Iniciar ──────────────────────────────────────────────────────────────────

loadBooks();