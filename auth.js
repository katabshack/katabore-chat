document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    const messageContainer = document.getElementById('message-container');

    // Icônes SVG pour le bouton "œil"
    const icons = {
        eye: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 10c-2.48 0-4.5-2.02-4.5-4.5S9.52 5.5 12 5.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm0-7C10.62 7.5 9.5 8.62 9.5 10s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5S13.38 7.5 12 7.5z"/></svg>`,
        eyeOff: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L21.73 22 23 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.16-.08.33-.08.5 0 1.66 1.34 3 3 3 .17 0 .34-.03.5-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`
    };

    const showMessage = (message, type) => {
        if (messageContainer) {
            messageContainer.textContent = message;
            messageContainer.className = '';
            messageContainer.classList.add(type);
        }
    };

    togglePasswordBtns.forEach(btn => {
        const passwordInput = btn.previousElementSibling;
        btn.innerHTML = icons.eye;
        btn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                btn.innerHTML = icons.eyeOff;
            } else {
                passwordInput.type = 'password';
                btn.innerHTML = icons.eye;
            }
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
                const response = await fetch('http://localhost:3000/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();

                if (response.ok) {
                    // MESSAGE MODIFIÉ AVEC COMPTE À REBOURS
                    showMessage("Compte créé avec succès ! Redirection vers la connexion...", 'success');

                    email.value = '';
                    password.value = '';

                    // REDIRECTION AUTOMATIQUE APRÈS 2 SECONDES
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);

                } else {
                    // Gère les erreurs spécifiques de Supabase
                    let errorMessage = data.error;
                    if (errorMessage.includes("User already registered")) {
                        errorMessage = "Cette adresse e-mail est déjà utilisée.";
                    } else if (errorMessage.includes("Password should be at least 6 characters")) {
                        errorMessage = "Le mot de passe doit faire au moins 6 caractères.";
                    }
                    throw new Error(errorMessage);
                }
            } catch (error) {
                showMessage(error.message, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;

            try {
                const response = await fetch('http://localhost:3000/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();

                if (response.ok) {
                    showMessage("Connexion réussie ! Redirection...", 'success');
                    localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } else {
                    throw new Error("E-mail ou mot de passe incorrect.");
                }
            } catch (error) {
                showMessage(error.message, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }
});