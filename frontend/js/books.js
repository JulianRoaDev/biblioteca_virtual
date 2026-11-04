const API = 'https://biblioteca-virtual-kos6.onrender.com/api';

function getToken() { return localStorage.getItem('token'); }

function requireAuth() {
  if (!getToken()) window.location.href = 'login.html';
}

function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });
}

function setupNavToggle() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle) toggle.addEventListener('click', () => links.classList.toggle('open'));
}

async function fetchBooks() {
  const res = await fetch(`${API}/books`);
  return res.json();
}

// ===== DASHBOARD COMPATIBILITY =====
if (document.getElementById('recent-grid')) {
  requireAuth();
  setupLogout();
  setupNavToggle();
  document.getElementById('admin-name').textContent = localStorage.getItem('adminName') || 'Admin';

  fetchBooks().then(books => {
    document.getElementById('total-books').textContent = books.length;
    const thisMonth = books.filter(b => {
      const d = new Date(b.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    document.getElementById('recent-books').textContent = thisMonth.length;

    const grid = document.getElementById('recent-grid');
    const recent = books.slice(0, 6);
    if (recent.length === 0) { grid.innerHTML = '<p class="loading-text">No hay libros aún.</p>'; return; }
    grid.innerHTML = recent.map(bookCard).join('');
  });
}

// ===== GESTIONAR LIBROS =====
if (document.getElementById('books-tbody')) {
  requireAuth();
  setupLogout();
  setupNavToggle();

  let allBooks = [];

  fetchBooks().then(books => {
    allBooks = books;
    renderTable(books);
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderTable(allBooks.filter(b =>
      b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    ));
  });

  function renderTable(books) {
    const tbody = document.getElementById('books-tbody');
    if (books.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading-text">No se encontraron libros.</td></tr>';
      return;
    }
    tbody.innerHTML = books.map(b => {
      const coverSrc = b.cover_url || (b.cover_image ? (b.cover_image.startsWith('http') ? b.cover_image : `http://localhost:3000${b.cover_image}`) : null);
      return `
        <tr>
          <td>
            ${coverSrc
              ? `<img src="${coverSrc}" class="cover-thumb" alt="Portada de ${b.title}" />`
              : `<div class="cover-thumb">📖</div>`}
          </td>
          <td><strong style="color:#FFFFFF;">${b.title}</strong></td>
          <td style="color:var(--text-muted);">${b.author}</td>
          <td style="color:var(--text-faint);">${b.publication_date ? new Date(b.publication_date).toLocaleDateString('es-CO') : '—'}</td>
          <td>
            <div class="actions-cell">
              <a href="viewer.html?id=${b.id}" class="btn btn-outline btn-sm">👁 Ver</a>
              <button class="btn btn-outline btn-sm" style="border-color:rgba(245,158,11,0.5);color:#FBBF24;" onclick="openEdit(${b.id})">✏️ Editar</button>
              <button class="btn btn-danger btn-sm" onclick="deleteBook(${b.id})">🗑 Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Modal de edición
  window.openEdit = async (id) => {
    const res = await fetch(`${API}/books/${id}`);
    const book = await res.json();
    document.getElementById('edit-id').value = book.id;
    document.getElementById('edit-title').value = book.title;
    document.getElementById('edit-author').value = book.author;
    document.getElementById('edit-synopsis').value = book.synopsis || '';
    document.getElementById('edit-date').value = book.publication_date
      ? book.publication_date.split('T')[0] : '';
    document.getElementById('edit-modal').classList.remove('hidden');
  };

  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('edit-modal').classList.add('hidden');
  });

  document.getElementById('modal-save').addEventListener('click', async () => {
    const id = document.getElementById('edit-id').value;
    const body = {
      title: document.getElementById('edit-title').value,
      author: document.getElementById('edit-author').value,
      synopsis: document.getElementById('edit-synopsis').value,
      publication_date: document.getElementById('edit-date').value,
    };
    await fetch(`${API}/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    document.getElementById('edit-modal').classList.add('hidden');
    window.location.reload();
  });

  window.deleteBook = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este libro? Esta acción no se puede deshacer.')) return;
    await fetch(`${API}/books/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    window.location.reload();
  };
}

function bookCard(b) {
  const coverSrc = b.cover_url || (b.cover_image ? (b.cover_image.startsWith('http') ? b.cover_image : `http://localhost:3000${b.cover_image}`) : null);
  return `
    <div class="book-card" onclick="window.location.href='viewer.html?id=${b.id}'">
      <div class="book-card-cover">
        ${coverSrc
          ? `<img src="${coverSrc}" alt="${b.title}" />`
          : '📖'}
        <div class="book-card-actions-hover">
          <span class="book-action-chip">▶ Leer Ahora</span>
        </div>
      </div>
      <div class="book-card-body">
        <h3 class="book-card-title">${b.title}</h3>
        <p class="book-card-author">${b.author}</p>
      </div>
    </div>`;
}
