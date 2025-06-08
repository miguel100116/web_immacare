// START OF FILE frontend/src/pages/profile.js

export function initializeProfilePage() {
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return; // Only run on the profile page

    const messageArea = document.getElementById('profile-message-area');

    /**
     * Fetches user data and populates the form fields.
     */
    async function loadProfileData() {
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

    /**
     * Adds event listeners to the "Change" buttons to make fields editable.
     */
    function initializeEditableFields() {
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

    /**
     * Handles the form submission to update the user's profile.
     */
    async function handleProfileUpdate(event) {
        event.preventDefault();
        const saveBtn = document.getElementById('save-profile-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        messageArea.textContent = '';
        
        const formData = new FormData(profileForm);
        // The names need to match the backend API's expectations.
        const dataToSave = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            suffix: formData.get('suffix'),
            Age: formData.get('age'), // Backend expects 'Age' with capital A
            PhoneNumber: formData.get('phone'), // Backend expects 'PhoneNumber'
            Address: formData.get('address'), // Backend expects 'Address'
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

            // Re-lock the fields
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
}