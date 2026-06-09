const API = 'https://biblioteca-virtual-kos6.onrender.com';

document.getElementById('login-btn').addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error-msg');

  if (!username || !password) {
    showError(errorEl, 'Por favor completa todos los campos.');
    return;
  }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(errorEl, data.message || 'Error al iniciar sesión.');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('adminName', data.username);
    window.location.href = 'dashboard.html';
  } catch {
    showError(errorEl, 'No se pudo conectar con el servidor.');
  }
});

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}