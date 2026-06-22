window.getAuthHeaders = () => {
  return {
    'x-user-id': localStorage.getItem('userId') || '',
    'x-user-role': localStorage.getItem('userRole') || ''
  };
};

async function checkAuth() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    window.location.href = '/login';
  } else {
    document.getElementById('user-name').innerText = localStorage.getItem('userNom');
  }
}

async function logout() {
  localStorage.clear();
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

function showModal(id) {
  document.getElementById(id).classList.add('active');
}

function hideModal(id) {
  document.getElementById(id).classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  checkAuth();
});
