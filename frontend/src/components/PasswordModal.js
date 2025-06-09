// frontend/src/components/PasswordModal.js

const template = document.createElement('template');
template.innerHTML = `
    <style>
        /* All the styling for the modal and its content goes here */
        .modal {
            display: none; /* Hidden by default */
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.6);
            align-items: center;
            justify-content: center;
        }
        .modal-content {
            background-color: #fefefe;
            margin: auto;
            padding: 20px 30px;
            border: 1px solid #888;
            width: 90%;
            max-width: 450px;
            border-radius: 8px;
            box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0,0.19);
            animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .modal-header h2 {
            margin: 0;
            font-size: 1.4em;
            color: #333;
        }
        .close-modal {
            color: #aaa;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        .close-modal:hover,
        .close-modal:focus {
            color: black;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        .form-group input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box; /* Important */
        }
        .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
        }
        .cancel-btn, .save-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        }
        .cancel-btn {
            background-color: #f0f0f0;
            border: 1px solid #ddd;
        }
        .save-btn {
            background-color: #4CAF50; /* A generic green */
            color: white;
        }
        .message-area {
            text-align: center; 
            margin-top: 15px;
            font-weight: bold;
            min-height: 1.2em;
        }
        .message-area.success { color: green; }
        .message-area.error { color: red; }
    </style>
    <div class="modal" id="change-password-modal-component">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Change Your Password</h2>
                <span class="close-modal">×</span>
            </div>
            <div class="modal-body">
                <form id="change-password-form-component">
                    <div class="form-group">
                        <label for="current-password">Current Password</label>
                        <input type="password" id="current-password" name="currentPassword" required autocomplete="current-password">
                    </div>
                    <div class="form-group">
                        <label for="new-password">New Password</label>
                        <input type="password" id="new-password" name="newPassword" required autocomplete="new-password">
                    </div>
                    <div class="form-group">
                        <label for="confirm-new-password">Confirm New Password</label>
                        <input type="password" id="confirm-new-password" name="confirmNewPassword" required autocomplete="new-password">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="save-btn">Update Password</button>
                    </div>
                </form>
                <div id="password-message-area-component" class="message-area"></div>
            </div>
        </div>
    </div>
`;

class PasswordModal extends HTMLElement {
    constructor() {
        super();
        // Attach a shadow DOM to the element.
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Get elements from the shadow DOM
        this.modal = this.shadowRoot.querySelector('.modal');
        this.form = this.shadowRoot.querySelector('form');
        this.messageArea = this.shadowRoot.querySelector('.message-area');
        this.closeBtn = this.shadowRoot.querySelector('.close-modal');
        this.cancelBtn = this.shadowRoot.querySelector('.cancel-btn');
    }

    // --- Component Lifecycle Callbacks ---
    connectedCallback() {
        // This method is called when the component is added to the DOM
        this.closeBtn.addEventListener('click', () => this.hide());
        this.cancelBtn.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', e => {
            if (e.target === this.modal) this.hide();
        });
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    disconnectedCallback() {
        // Clean up event listeners when the component is removed
        this.closeBtn.removeEventListener('click', () => this.hide());
        this.cancelBtn.removeEventListener('click', () => this.hide());
        this.form.removeEventListener('submit', this.handleSubmit.bind(this));
    }

    // --- Custom Methods ---
    show() {
        this.form.reset();
        this.messageArea.textContent = '';
        this.modal.style.display = 'flex';
    }

    hide() {
        this.modal.style.display = 'none';
    }

    async handleSubmit(e) {
        e.preventDefault();
        this.messageArea.textContent = '';

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        if (data.newPassword !== data.confirmNewPassword) {
            this.messageArea.textContent = 'New passwords do not match.';
            this.messageArea.className = 'message-area error';
            return;
        }
        if (data.newPassword.length < 8) {
            this.messageArea.textContent = 'New password must be at least 8 characters long.';
            this.messageArea.className = 'message-area error';
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

            this.messageArea.textContent = result.message;
            this.messageArea.className = 'message-area success';
            this.form.reset();
            
            setTimeout(() => this.hide(), 2000);

        } catch (error) {
            this.messageArea.textContent = error.message;
            this.messageArea.className = 'message-area error';
        }
    }
}

// Define the new custom element
window.customElements.define('password-modal', PasswordModal);