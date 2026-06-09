const API = 'https://biblioteca-virtual-kos6.onrender.com';
function getToken() { return localStorage.getItem('token'); }

if (!getToken()) window.location.href = 'login.html';

// File drop zones
const pdfDrop = document.getElementById('pdf-drop');
const coverDrop = document.getElementById('cover-drop');
const pdfInput = document.getElementById('pdf');
const coverInput = document.getElementById('cover');

pdfDrop.addEventListener('click', () => pdfInput.click());
coverDrop.addEventListener('click', () => coverInput.click());

pdfInput.addEventListener('change', () => {
  const file = pdfInput.files[0];
  if (file) {
    document.getElementById('pdf-name').textContent = `📄 ${file.name}`;
    document.getElementById('pdf-name').classList.remove('hidden');
  }
});

coverInput.addEventListener('change', () => {
  const file = coverInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('cover-preview');
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('upload-btn').addEventListener('click', async () => {
  const alert = document.getElementById('upload-alert');
  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const pdf = pdfInput.files[0];

  if (!title || !author || !pdf) {
    showAlert(alert, 'alert-error', '⚠️ Título, autor y PDF son obligatorios.');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('author', author);
  formData.append('synopsis', document.getElementById('synopsis').value);
  formData.append('publication_date', document.getElementById('pub-date').value);
  formData.append('pdf', pdf);
  if (coverInput.files[0]) formData.append('cover', coverInput.files[0]);

  document.getElementById('upload-btn').disabled = true;
  document.getElementById('upload-btn').textContent = '⏳ Subiendo...';

  try {
    const res = await fetch(`${API}/books`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(alert, 'alert-error', data.message || 'Error al subir el libro.');
    } else {
      showAlert(alert, 'alert-success', '✅ Libro subido correctamente.');
      setTimeout(() => window.location.href = 'books.html', 1500);
    }
  } catch {
    showAlert(alert, 'alert-error', 'No se pudo conectar con el servidor.');
  } finally {
    document.getElementById('upload-btn').disabled = false;
    document.getElementById('upload-btn').textContent = '📤 Subir Libro';
  }
});

function showAlert(el, type, msg) {
  el.className = `alert ${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}