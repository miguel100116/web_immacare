// REMOVE the export. This file will run itself.
// export function initializeProfilePage() { ... }

// --- START: Wrap everything in a DOMContentLoaded listener ---
document.addEventListener('DOMContentLoaded', () => {

    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return; // Only run on the profile page

    const messageArea = document.getElementById('profile-message-area');

    // --- The 'initializePasswordModal' logic goes here ---
    const openPasswordModalBtn = document.getElementById('open-password-modal-btn');
    const passwordModalComponent = document.querySelector('password-modal');
    
    // Add some console logs to be 100% sure
    console.log("Profile.js: Searching for button:", openPasswordModalBtn);
    console.log("Profile.js: Searching for modal component:", passwordModalComponent);

    if (openPasswordModalBtn && passwordModalComponent) {
        openPasswordModalBtn.addEventListener('click', () => {
            console.log("Profile.js: 'Change Password' button clicked!");
            passwordModalComponent.show();
        });
    } else {
        console.error("Profile.js: Could not find the password button or modal component.");
    }
    // --- End of password modal logic ---

    async function loadProfileData() {
        // ... (this function's content is fine)
        try {
            const response = await fetch('/getUser');
            if (!response.ok) throw new Error('Could not fetch user data.');
            
            const user = await response.json();
            if (!user.loggedIn) {
                window.location.href = '/login.html';
                return;
            }

            const fields = {
                'profile-firstName': user.firstName,
                'profile-lastName': user.lastName,
                'profile-suffix': user.suffix,
                'profile-age': user.age,
                'profile-phone': user.phoneNumber,
                'profile-address': user.address,
            };

            for (const id in fields) {
                const input = document.getElementById(id);
                if (input) {
                    input.value = fields[id] || '';
                    input.readOnly = true;
                    input.classList.add('pre-filled');
                }
            }
        } catch (error) {
            messageArea.textContent = 'Error loading profile. Please refresh.';
            messageArea.className = 'message-area error';
        }
    }

    function initializeEditableFields() {
        // ... (this function's content is fine)
        profileForm.querySelectorAll('.edit-btn').forEach(button => {
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);
            if (input) {
                button.addEventListener('click', () => {
                    input.readOnly = false;
                    input.classList.remove('pre-filled');
                    input.focus();
                });
            }
        });
    }

    async function handleProfileUpdate(event) {
        // ... (this function's content is fine)
        event.preventDefault();
        const saveBtn = document.getElementById('save-profile-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        messageArea.textContent = '';
        
        const formData = new FormData(profileForm);
        const dataToSave = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            suffix: formData.get('suffix'),
            Age: formData.get('age'),
            PhoneNumber: formData.get('phone'),
            Address: formData.get('address'),
        };

        try {
            const response = await fetch('/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to update profile.');

            messageArea.textContent = 'Profile updated successfully!';
            messageArea.className = 'message-area success';

            profileForm.querySelectorAll('input').forEach(input => {
                input.readOnly = true;
                input.classList.add('pre-filled');
            });

        } catch (error) {
            messageArea.textContent = error.message;
            messageArea.className = 'message-area error';
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }

    // Initialize everything
    loadProfileData();
    initializeEditableFields();
    profileForm.addEventListener('submit', handleProfileUpdate);

}); // --- END: Wrap everything in a DOMContentLoaded listener ---