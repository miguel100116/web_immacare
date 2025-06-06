// frontend/src/routes/router.js

/**
 * Navigates to the specified page.
 * The server is configured to serve these HTML files from the /screens directory.
 * @param {string} page - The HTML file to navigate to (e.g., "main.html").
 */
function navigateTo(page) {
  // We just need to change the window location. The server handles the rest.
  window.location.href = `/${page}`;
}

/**
 * Initializes the router by attaching click event listeners to all navigation links.
 */
function initializeRouter() {
  document.body.addEventListener('click', (event) => {
    // Check if the clicked element or its parent has a 'data-nav' attribute
    const navLink = event.target.closest('[data-nav]');
    
    if (navLink) {
      event.preventDefault(); // Stop the default link behavior
      const page = navLink.dataset.nav; // Get the page from the attribute (e.g., "main.html")
      navigateTo(page);
    }
  });
}

// Export the function so other files can use it
export { initializeRouter };