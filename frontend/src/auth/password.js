// frontend/src/auth/password.js

/**
 * Initializes the "Change Password" modal functionality on any page that includes it.
 */
export function initializeChangePasswordModal() {
    const openBtn = document.getElementById('open-password-modal-btn');
    const modal = document.getElementById('change-password-modal');
    const form = document.getElementById('change-password-form');
    const messageArea = document.getElementById('password-message-area');
    const closeModalBtn = modal?.querySelector('.close-modal');
    const cancelBtn = modal?.querySelector('.cancel-btn');

    if (!openBtn || !modal || !form || !messageArea) {
        // Silently exit if the required elements aren't on the page.
        return;
    }

    const openModal = () => {
        form.reset();
        messageArea.textContent = '';
        modal.style.display = 'flex';
    };

    const closeModal = () => {
        modal.style.display = 'none';
    };

    openBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.textContent = '';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Client-side validation
        if (data.newPassword !== data.confirmNewPassword) {
            messageArea.textContent = 'New passwords do not match.';
            messageArea.className = 'message-area error';
            return;
        }
        if (data.newPassword.length < 8) {
            messageArea.textContent = 'New password must be at least 8 characters long.';
            messageArea.className = 'message-area error';
            return;
        }

        try {
            const response = await fetch('/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');

            messageArea.textContent = result.message;
            messageArea.className = 'message-area success';
            form.reset();
            
            // Close modal after a short delay on success
            setTimeout(closeModal, 2000);

        } catch (error) {
            messageArea.textContent = error.message;
            messageArea.className = 'message-area error';
        }
    });
}