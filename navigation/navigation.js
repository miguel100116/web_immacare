document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('.navbar a[data-nav]');
    navLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            const page = this.getAttribute('data-nav');
            // If the link is for LOGIN and it's currently hidden (meaning user is logged in),
            // it shouldn't do anything here, as the redirect logic in updateUserNav handles it.
            // Or, if it's LOGOUT, let the default href="/logout" work.
            if (this.id === 'nav-logout-link') {
                return; // Allow default browser navigation for logout
            }

            if (page && page !== '#') {
                event.preventDefault();
                window.location.href = page;
            }
        });
    });

    const loginLink = document.getElementById('nav-login-link');
    const profileLink = document.getElementById('nav-profile-link');
    const logoutLink = document.getElementById('nav-logout-link');

    async function updateUserNav() {
        // Set a default "loading" state for the nav to prevent flicker and premature clicks
        if (loginLink) loginLink.style.display = 'none'; // Initially hide login
        if (profileLink) profileLink.style.display = 'none'; // Initially hide profile
        if (logoutLink) logoutLink.style.display = 'none'; // Initially hide logout

        try {
            const response = await fetch('/getUser');
            if (!response.ok) {
                console.error('Failed to fetch user status:', response.statusText);
                // Fallback: Show login link if fetch fails
                if (loginLink) loginLink.style.display = 'inline'; // Or your default display
                return;
            }

            const userData = await response.json();

            if (userData.loggedIn) {
                // User is logged in
                if (loginLink) loginLink.style.display = 'none'; // Ensure LOGIN is hidden
                if (profileLink) profileLink.style.display = 'inline'; // Show PROFILE
                if (logoutLink) logoutLink.style.display = 'inline'; // Show LOGOUT

                // If user is on login.html or signup.html and IS logged in, redirect them
                const currentPagePath = window.location.pathname;
                if (currentPagePath.endsWith('/login.html') || currentPagePath.endsWith('/signup.html')) {
                    if (userData.isAdmin) {
                        window.location.href = '/admin.html';
                    } else {
                        window.location.href = '/main.html';
                    }
                    return; // Important: stop further execution if redirecting
                }
            } else {
                // User is NOT logged in
                if (loginLink) loginLink.style.display = 'inline'; // Show LOGIN
                if (profileLink) profileLink.style.display = 'none'; // Keep PROFILE hidden
                if (logoutLink) logoutLink.style.display = 'none'; // Keep LOGOUT hidden

                // Optional: If on a protected page and not logged in, redirect to login
                // This is better handled by server-side `ensureAuthenticated` redirects,
                // but can be a client-side fallback.
                const protectedClientPages = ['myappointments.html', 'appointment.html', 'profile.html', 'main.html', 'doctors.html']; // Add main.html and doctors.html if they require login
                const currentPageFile = window.location.pathname.split('/').pop();
                if (protectedClientPages.includes(currentPageFile)) {
                    // Check if already on login or signup to prevent redirect loop
                    if (!window.location.pathname.endsWith('/login.html') && !window.location.pathname.endsWith('/signup.html')) {
                         window.location.href = '/login.html?message=Please login to access this page.';
                         return; // Stop further execution
                    }
                }
            }
        } catch (error) {
            console.error('Error updating user navigation:', error);
            // Fallback: Show login link in case of any JS error
            if (loginLink) loginLink.style.display = 'inline';
        }
    }

    updateUserNav();
});