// frontend/src/auth/signup.js

/**
 * Initializes the signup form logic, including validation and submission.
 */
export function initializeSignupForm() {
  const signupForm = document.getElementById('signupForm');

  // Only run this code if the signup form exists on the current page
  if (!signupForm) {
    return;
  }
  
  const messageArea = document.getElementById('signup-message-area');

  signupForm.addEventListener('submit', async function (event) {
    event.preventDefault(); // Stop the form from submitting immediately

    if (messageArea) {
      messageArea.textContent = '';
      messageArea.style.color = 'red'; // Default to red for errors
    }

    const formData = new FormData(signupForm);
    const data = Object.fromEntries(formData.entries());

    // --- Client-side validation ---
    if (data.signupPassword !== data.confirmPassword) {
      if (messageArea) messageArea.textContent = 'Passwords do not match.';
      return;
    }
    
    if (data.signupPassword.length < 8 || !/[A-Z]/.test(data.signupPassword) ||
        !/[a-z]/.test(data.signupPassword) || !/[0-9]/.test(data.signupPassword) ||
        !/[^A-Za-z0-9]/.test(data.signupPassword)) {
      if (messageArea) messageArea.textContent = "Password must be 8+ chars & include uppercase, lowercase, number, & special char.";
      return;
    }

    if (data.PhoneNumber && !/^[0-9]{11}$/.test(data.PhoneNumber)) {
      if (messageArea) messageArea.textContent = "Please enter a valid 11-digit phone number.";
      return;
    }
    // --- End of validation ---

    try {
      const response = await fetch('/post', { // Server registration endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // SUCCESS
        if (messageArea) {
          messageArea.textContent = result.message || 'Registration successful! Please check your email.';
          messageArea.style.color = 'green';
        }
        signupForm.reset(); // Clear the form fields
      } else {
        // FAILURE (from server)
        if (messageArea) {
          messageArea.textContent = result.error || 'An unknown error occurred.';
        }
      }
    } catch (error) {
      // NETWORK or other fetch error
      console.error('Signup request error:', error);
      if (messageArea) {
        messageArea.textContent = 'A network error occurred. Please try again.';
      }
    }
  });
}