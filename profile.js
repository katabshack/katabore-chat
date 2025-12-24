document.addEventListener('DOMContentLoaded', () => {
    const userEmailElement = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const session = JSON.parse(localStorage.getItem('supabase.auth.token'));

    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }

    userEmailElement.textContent = session.user.email;

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('supabase.auth.token');
        alert("Vous avez été déconnecté.");
        window.location.href = 'login.html';
    });
});