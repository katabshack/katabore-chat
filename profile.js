document.addEventListener('DOMContentLoaded', () => {
    const userEmailElement = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Éléments de la modal
    const logoutModal = document.getElementById('logout-modal');
    const cancelLogoutBtn = document.getElementById('cancel-logout');
    const confirmLogoutBtn = document.getElementById('confirm-logout');

    const session = JSON.parse(localStorage.getItem('supabase.auth.token'));

    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }

    userEmailElement.textContent = session.user.email;

    // 1. Ouvrir la modal au clic
    logoutBtn.addEventListener('click', () => {
        logoutModal.classList.add('active');
    });

    // 2. Annuler
    cancelLogoutBtn.addEventListener('click', () => {
        logoutModal.classList.remove('active');
    });

    // 3. Confirmer la déconnexion
    confirmLogoutBtn.addEventListener('click', () => {
        localStorage.removeItem('supabase.auth.token');
        window.location.href = 'login.html';
    });
});