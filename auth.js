document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    const messageContainer = document.getElementById('message-container');

    // DÉTECTION AUTOMATIQUE DE L'URL DU SERVEUR
    // Si on est sur render, ce sera https://ton-site.onrender.com
    // Si on est en local, ce sera http://localhost:3000
    const BACKEND_URL = window.location.origin;

    const showMessage = (message, type) => {
        if (messageContainer) {
            messageContainer.textContent = message;
            messageContainer.className = ''; // Reset classes
            messageContainer.classList.add(type);
            messageContainer.style.display = 'block';
        }
    };

    togglePasswordBtns.forEach(btn => {
        btn.innerHTML = '👁️';
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            input.type = input.type === 'password' ? 'text' : 'password';
        });
    });

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitButton = signupForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;

            try {
                // UTILISATION DE L'URL DYNAMIQUE
                const response = await fetch(`${BACKEND_URL}/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();

                if (response.ok) {
                    showMessage("Compte créé ! Redirection...", 'success');
                    setTimeout(() => window.location.href = 'login.html', 2000);
                } else {
                    throw new Error(data.error || "Erreur inscription");
                }
            } catch (error) {
                showMessage(error.message, 'error');
                submitButton.disabled = false;
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                // UTILISATION DE L'URL DYNAMIQUE
                const response = await fetch(`${BACKEND_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
                    window.location.href = 'index.html';
                } else {
                    throw new Error(data.error || "Erreur connexion");
                }
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }
});