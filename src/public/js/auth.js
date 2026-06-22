document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userNom', data.user.nom);
        window.location.href = data.redirectUrl;
      } else {
        const err = document.getElementById('error-msg');
        err.innerText = data.message;
        err.style.color = 'red';
      }
    });
  }
});
