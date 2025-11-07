// frontend/src/navigation/navigation.js

/**
 * The main initializer for all navigation logic.
 * This is the function that will be imported and called by app.js.
 */
export async function initializeNavigation() {
  // We separate the two main tasks for clarity.
  setupNavClickListeners();
  await updateNavUIBasedOnAuth();
}

/**
 * Sets up a single, efficient event listener on the body to handle all navigation clicks.
 */
function setupNavClickListeners() {
  document.body.addEventListener('click', (event) => {
    const navLink = event.target.closest('a[data-nav]');
    
    // --- THE FIX: Add a check to ignore form submit buttons ---
    // This isn't the main problem but is good practice.
    const isSubmitButton = event.target.closest('button[type="submit"]');

    if (navLink && !isSubmitButton) { // Only run if it's a nav link AND NOT a submit button
      event.preventDefault();
      const page = navLink.dataset.nav;
      window.location.href = `/${page}`;
    }
  });
}

/**
 * Fetches the user's login status and updates the navigation bar's visibility.
 */
async function updateNavUIBasedOnAuth() {
  const loggedInElements = document.querySelectorAll('.nav-item-logged-in');
  const loggedOutElements = document.querySelectorAll('.nav-item-logged-out');
  
  // You need to add data-requires-login="true" to your protected links in HTML
  // for this to work perfectly.
  const protectedLinks = document.querySelectorAll('[data-requires-login="true"]');

  try {
    const response = await fetch('/check-auth'); // The endpoint that tells us if user is logged in
    const data = await response.json();

    if (data.loggedIn) {
      // User is LOGGED IN
      loggedInElements.forEach(el => el.style.display = 'inline');
      loggedOutElements.forEach(el => el.style.display = 'none');
      protectedLinks.forEach(el => el.style.display = 'inline');

      // If a logged-in user somehow lands on the login/signup page, redirect them.
      const currentPage = window.location.pathname;
      if (currentPage.endsWith('/login.html') || currentPage.endsWith('/signup.html')) {
        window.location.href = data.user.isAdmin ? '/admin.html' : '/main.html';
      }

    } else {
      // User is LOGGED OUT
      loggedInElements.forEach(el => el.style.display = 'none');
      loggedOutElements.forEach(el => el.style.display = 'inline');
      protectedLinks.forEach(el => el.style.display = 'none');
    }
  } catch (error) {
    console.error('Auth check failed, defaulting to logged-out view:', error);
    // On error, always show the logged-out state for safety.
    loggedInElements.forEach(el => el.style.display = 'none');
    loggedOutElements.forEach(el => el.style.display = 'inline');
    protectedLinks.forEach(el => el.style.display = 'none');
  }
}