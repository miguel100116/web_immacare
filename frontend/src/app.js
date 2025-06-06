// frontend/src/app.js

// --- (Your imports are all correct) ---
import { initializeLoginForm } from './auth/login.js';
import { initializeSignupForm } from './auth/signup.js';
import { initializeNavigation } from './navigation/navigation.js';
import { initializeConfirmationModal } from './ui/modal.js';
import { loadComponent } from './ui/componentLoader.js';

/**
 * The main entry point for the entire frontend application.
 * It runs all the necessary setup functions.
 */
async function main() {

  // --- THIS IS THE CORRECTED LINE ---
  // The skeleton path comes first, then the final component path.
  await loadComponent(
      'navbar-placeholder',                   // Argument 1: The ID of the div
      'src/components/navbarSkeleton.html', // Argument 2: The path to the SKELETON
      'src/components/navbar.html'          // Argument 3: The path to the REAL component
  );
  
  // These functions will now run correctly after the REAL navbar has been loaded.
  await initializeNavigation();
  initializeLoginForm();
  initializeSignupForm();
  initializeConfirmationModal();
}

// Run the main function when the DOM is ready.
document.addEventListener('DOMContentLoaded', main);