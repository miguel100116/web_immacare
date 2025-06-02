// signup.js
document.addEventListener('DOMContentLoaded', function () {
    const signupForm = document.getElementById('signupForm');
    const messageArea = document.getElementById('signup-message-area');

    if (signupForm) {
        signupForm.addEventListener('submit', async function (event) {
            event.preventDefault(); // Prevent default form submission

            // Clear previous messages
            if (messageArea) {
                messageArea.textContent = '';
                messageArea.style.color = 'red'; // Default to red, change on success
            }

            const formData = new FormData(signupForm);
            const data = Object.fromEntries(formData.entries());

            // Client-side validation (basic, more can be added)
            if (data.signupPassword !== data.confirmPassword) {
                if (messageArea) messageArea.textContent = 'Passwords do not match.';
                return;
            }
            
            // Password complexity check (mirroring server-side if possible)
            if (data.signupPassword.length < 8 || !/[A-Z]/.test(data.signupPassword) ||
                !/[a-z]/.test(data.signupPassword) || !/[0-9]/.test(data.signupPassword) ||
                !/[^A-Za-z0-9]/.test(data.signupPassword)) {
                if (messageArea) messageArea.textContent = "Password must be 8+ characters and include uppercase, lowercase, number, and special character.";
                return;
            }

            if (data.PhoneNumber && !/^[0-9]{11}$/.test(data.PhoneNumber)) {
                 if (messageArea) messageArea.textContent = "Please enter a valid 11-digit phone number.";
                return;
            }


            try {
                const response = await fetch('/post', { // Your server's registration endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json(); // Always expect JSON back

                if (response.ok && result.success) {
                    // Registration successful
                    if (messageArea) {
                        messageArea.textContent = result.message || 'Registration successful! Please check your email to verify.';
                        messageArea.style.color = 'green';
                    }
                    signupForm.reset(); // Clear the form
                    // Optionally redirect after a short delay or let user click login
                    // setTimeout(() => {
                    //     window.location.href = '/login.html?message=Registration successful! Please login.';
                    // }, 3000);
                } else {
                    // Registration failed, display error from server
                    if (messageArea) {
                        messageArea.textContent = result.error || 'An unknown error occurred during registration.';
                        messageArea.style.color = 'red';
                    }
                }
            } catch (error) {
                console.error('Signup request error:', error);
                if (messageArea) {
                    messageArea.textContent = 'A network error occurred. Please try again later.';
                    messageArea.style.color = 'red';
                }
            }
        });
    }
});