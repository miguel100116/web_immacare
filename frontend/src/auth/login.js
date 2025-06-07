export function initializeLoginForm() {
    const loginForm = document.getElementById('login-form');
    const messageArea = document.getElementById('message-area');
    
    if (!loginForm) return;

    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message && messageArea) {
        messageArea.textContent = decodeURIComponent(message).replace(/_/g, ' ');
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // We control the submission now.
        
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';
        messageArea.textContent = '';

        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Login failed.');
            }

            if (result.redirect) {
                // The client handles the navigation. This is key.
                window.location.href = result.redirect;
            } else {
                window.location.href = '/main.html'; // Fallback
            }

        } catch (error) {
            console.error('Login failed:', error);
            messageArea.textContent = error.message;
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    });
}