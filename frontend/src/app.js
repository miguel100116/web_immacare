// frontend/src/app.js

// ... (imports are correct) ...
import { initializeLoginForm } from './auth/login.js';
import { initializeSignupForm } from './auth/signup.js';
import { initializeNavigation } from './navigation/navigation.js';
import { initializeConfirmationModal } from './ui/modal.js';
import { loadComponent } from './ui/componentLoader.js';
// import { initializeProfilePage } from './pages/profile.js';
import { initializeSessionTimeout } from './auth/sessionTimeout.js';


async function main() {

  // Call 1: Load the Navbar (with its skeleton)
  await loadComponent(
      'navbar-placeholder',
      'src/components/navbarSkeleton.html',
      'src/components/navbar.html'
  );

  // Call 2: Load the Footer (without a skeleton)
  await loadComponent(
      'footer-placeholder',
      'src/components/footer.html' // The flexible componentLoader now understands this
  );
  

  initializeSessionTimeout();

  // These functions will now run correctly
  await initializeNavigation();
  initializeLoginForm();
  initializeSignupForm();
  initializeConfirmationModal();
}

// Run the main function when the DOM is ready.
document.addEventListener('DOMContentLoaded', main);