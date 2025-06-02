// In navigation/navigation.js
document.addEventListener('DOMContentLoaded', function () {
    // --- Navigation link click handler ---
    const navLinks = document.querySelectorAll('.navbar a[data-nav]');
    navLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            const page = this.getAttribute('data-nav');
            const requiresLogin = this.dataset.requiresLogin === 'true'; // Check for new attribute

            if (this.id === 'nav-logout-link') {
                return; // Allow default browser navigation for server-side logout
            }

            if (page && page !== '#') {
                event.preventDefault(); // Prevent default for all data-nav links initially

                // Check if page requires login and user is not logged in
                // We'll get login status from a global variable or re-fetch, but for now, let's assume we check again
                // or rely on the server redirect from ensureAuthenticated.
                // For a smoother UX for nav clicks, we can check a client-side flag set by updateUserNav.
                if (requiresLogin && !window.isUserLoggedIn) { // Assume isUserLoggedIn is set by updateUserNav
                    window.location.href = '/login.html?message=Please login to access ' + page + '&redirect=' + encodeURIComponent(page);
                    return;
                }
                window.location.href = page;
            }
        });
    });
    // --- End of navigation link click handler ---

    // --- Navbar Update Logic ---
    const loginLink = document.getElementById('nav-login-link');
    const profileLink = document.getElementById('nav-profile-link'); // Assuming you'll add this
    const logoutLink = document.getElementById('nav-logout-link');
    const appointmentNavLink = document.getElementById('appointment-link'); // ID for Appointment nav link
    const myAppointmentsNavLink = document.getElementById('myappointments-link'); // ID for My Appointments nav link
    // const userFullnameSpan = document.getElementById('nav-user-fullname');

    // Global flag for client-side checks (e.g., by schedule buttons)
    window.isUserLoggedIn = false;
    window.loggedInUserIsAdmin = false;

    async function updateUserNav() {
        // Set a "loading" state - hide links that depend on login status
        if (loginLink) loginLink.style.display = 'none';
        if (profileLink) profileLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
        if (appointmentNavLink) appointmentNavLink.style.display = 'none'; // Hide by default
        if (myAppointmentsNavLink) myAppointmentsNavLink.style.display = 'none'; // Hide by default

        try {
            const response = await fetch('/getUser');
            if (!response.ok) {
                console.error('Failed to fetch user status:', response.statusText);
                // Fallback: Show login link, hide protected links
                if (loginLink) loginLink.style.display = 'inline';
                // Ensure Home and Doctors are always visible as per your requirement
                if (document.getElementById('home-link')) document.getElementById('home-link').style.display = 'inline';
                if (document.getElementById('doctors-link')) document.getElementById('doctors-link').style.display = 'inline';
                return;
            }

            const userData = await response.json();
            window.isUserLoggedIn = userData.loggedIn; // Set global flag
            window.loggedInUserIsAdmin = userData.isAdmin || false;

            // Always visible links
            if (document.getElementById('home-link')) document.getElementById('home-link').style.display = 'inline';
            if (document.getElementById('doctors-link')) document.getElementById('doctors-link').style.display = 'inline';


            if (userData.loggedIn) {
                // User is logged in
                if (loginLink) loginLink.style.display = 'none';
                if (profileLink) profileLink.style.display = 'inline';
                if (logoutLink) logoutLink.style.display = 'inline';
                if (appointmentNavLink) appointmentNavLink.style.display = 'inline'; // Show Appointment
                if (myAppointmentsNavLink) myAppointmentsNavLink.style.display = 'inline'; // Show My Appointments

                // if (userFullnameSpan && userData.fullname) {
                //     userFullnameSpan.textContent = `Hi, ${userData.fullname.split(' ')[0]}`;
                //     userFullnameSpan.style.display = 'inline';
                // }

                // Redirect if logged-in user is on login/signup page
                const currentPagePath = window.location.pathname;
                if (currentPagePath.endsWith('/login.html') || currentPagePath.endsWith('/signup.html')) {
                    if (userData.isAdmin) {
                        window.location.href = '/admin.html';
                    } else {
                        window.location.href = '/main.html';
                    }
                    return;
                }
            } else {
                // User is NOT logged in
                if (loginLink) loginLink.style.display = 'inline';
                // Profile, Logout, Appointment, My Appointments remain hidden (or their default 'none' state)

                // Client-side redirect for pages that absolutely require login if accessed directly
                // Server-side ensureAuthenticated should be the primary guard.
                const strictlyProtectedPages = ['myappointments.html', 'appointment.html', 'profile.html'];
                const currentPageFile = window.location.pathname.split('/').pop();

                if (strictlyProtectedPages.includes(currentPageFile)) {
                     if (!window.location.pathname.endsWith('/login.html') && !window.location.pathname.endsWith('/signup.html')) {
                        window.location.href = `/login.html?message=Please login to access this page.&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Error updating user navigation:', error);
            if (loginLink) loginLink.style.display = 'inline';
            if (document.getElementById('home-link')) document.getElementById('home-link').style.display = 'inline';
            if (document.getElementById('doctors-link')) document.getElementById('doctors-link').style.display = 'inline';
        }
    }

    updateUserNav();
});