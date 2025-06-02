document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    const messageArea = document.getElementById('message-area');

    // Check for messages from server-side redirects (e.g., after verification or failed auth on protected route)
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        messageArea.textContent = decodeURIComponent(message);
        // Basic styling for messages based on common success/error indicators
        if (message.startsWith('✅') || 
            message.toLowerCase().includes('successful') ||
            message.toLowerCase().includes('verified') ||
            message.toLowerCase().includes('sent') ||
            message.toLowerCase().includes('reset')) {
            messageArea.style.color = 'green';
        } else {
            messageArea.style.color = 'red';
        }
    }

    if (loginForm) { // Ensure the form exists on the page before adding listener
        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault(); // Prevent default form submission

            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());
            
            if (messageArea) { // Clear previous messages if messageArea exists
                messageArea.textContent = ''; 
            }

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (response.ok && result.redirect) {
                    // Successful login
                    if (messageArea) {
                        messageArea.textContent = 'Login successful! Redirecting...';
                        messageArea.style.color = 'green';
                    }
                    // Small delay to allow user to see the message, then redirect
                    setTimeout(() => {
                        window.location.href = result.redirect; // Redirect to the page specified by server
                    }, 500); // 0.5 second delay
                } else {
                    // Login failed
                    if (messageArea) {
                        messageArea.textContent = result.error || 'Login failed. Please try again.';
                        messageArea.style.color = 'red';
                    }
                }
            } catch (error) {
                console.error('Login request error:', error);
                if (messageArea) {
                    messageArea.textContent = 'An error occurred during login. Please try again later.';
                    messageArea.style.color = 'red';
                }
            }
        });
    } else {
        // This console log helps if you ever reuse login.js on a page without the form
        console.log("Login form not found on this page. Login submission script not attached.");
    }
});