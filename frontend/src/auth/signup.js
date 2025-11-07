// frontend/src/auth/signup.js

// --- HELPER FUNCTIONS ---

/**
 * A debounce function to limit how often a function is called.
 * @param {Function} func The function to debounce.
 * @param {number} delay The delay in milliseconds.
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * Updates the UI with validation feedback.
 * @param {HTMLElement} feedbackEl The feedback div element.
 * @param {string} message The message to display.
 * @param {boolean} isSuccess True for success (green), false for error (red).
 */
function updateFeedback(feedbackEl, message, isSuccess) {
    if (!feedbackEl) return;
    feedbackEl.textContent = message;
    feedbackEl.className = 'validation-feedback'; // Reset
    if (message) {
        feedbackEl.classList.add(isSuccess ? 'success' : 'error');
    }
}


// --- VALIDATOR FUNCTIONS ---

function validateName(inputEl, feedbackEl, fieldName) {
    const value = inputEl.value.trim();
    if (value.length === 0) {
        updateFeedback(feedbackEl, `${fieldName} is required.`, false);
        return false;
    }
    if (value.length < 2) {
        updateFeedback(feedbackEl, `${fieldName} must be at least 2 characters.`, false);
        return false;
    }
    updateFeedback(feedbackEl, '', true);
    return true;
}

async function validateEmail(inputEl, feedbackEl) {
    const email = inputEl.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        updateFeedback(feedbackEl, email.length > 0 ? 'Please enter a valid email format.' : '', false);
        return false;
    }

    try {
        // Using the new, specific route for the public signup page
        const url = `/signup/check-email?email=${encodeURIComponent(email)}`;
        const response = await fetch(url);

        if (response.status === 409) {
            const data = await response.json();
            updateFeedback(feedbackEl, data.error || 'This email is already registered.', false);
            return false;
        } else if (response.ok) {
            updateFeedback(feedbackEl, 'Email is available!', true);
            return true;
        }
    } catch (error) {
        console.error("Email validation fetch error:", error);
    }
    // Assume true if server check fails, to avoid blocking user on network issues
    return true; 
}

function validatePhoneNumber(inputEl, feedbackEl) {
    const phone = inputEl.value.trim();
    // Phone number is optional, so only validate if it has a value
    if (phone && !/^\d{11}$/.test(phone)) {
        updateFeedback(feedbackEl, 'Must be a valid 11-digit number.', false);
        return false;
    }
    updateFeedback(feedbackEl, phone ? '' : '', true);
    return true;
}

function validatePassword(inputEl, feedbackEl) {
    const pass = inputEl.value;
    const requirements = [
        { regex: /.{8,}/, message: "8+ characters" },
        { regex: /[A-Z]/, message: "uppercase" },
        { regex: /[a-z]/, message: "lowercase" },
        { regex: /[0-9]/, message: "number" },
        { regex: /[^A-Za-z0-9]/, message: "special char" }
    ];
    
    const errors = requirements
        .filter(req => !req.regex.test(pass))
        .map(req => req.message);

    if (errors.length > 0) {
        updateFeedback(feedbackEl, 'Requires: ' + errors.join(', '), false);
        return false;
    }
    updateFeedback(feedbackEl, 'Strong password!', true);
    return true;
}

function validateConfirmPassword(passwordEl, confirmEl, feedbackEl) {
    if (confirmEl.value !== passwordEl.value) {
        updateFeedback(feedbackEl, 'Passwords do not match.', false);
        return false;
    }
    updateFeedback(feedbackEl, confirmEl.value ? 'Passwords match!' : '', true);
    return true;
}


// --- MAIN INITIALIZATION LOGIC ---

export function initializeSignupForm() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    // Get all form input elements
    const firstNameInput = signupForm.querySelector('input[name="firstName"]');
    const lastNameInput = signupForm.querySelector('input[name="lastName"]');
    const emailInput = signupForm.querySelector('input[name="signupEmail"]');
    const phoneInput = signupForm.querySelector('input[name="PhoneNumber"]');
    const passwordInput = signupForm.querySelector('input[name="signupPassword"]');
    const confirmPasswordInput = signupForm.querySelector('input[name="confirmPassword"]');
    const messageArea = document.getElementById('signup-message-area');

    // Get all feedback div elements
    const firstNameFeedback = document.getElementById('firstName-feedback');
    const lastNameFeedback = document.getElementById('lastName-feedback');
    const emailFeedback = document.getElementById('email-feedback');
    const phoneFeedback = document.getElementById('phone-feedback');
    const passwordFeedback = document.getElementById('password-feedback');
    const confirmPasswordFeedback = document.getElementById('confirmPassword-feedback');

    // Debounced validator for the email field to avoid excessive server calls
    const debouncedEmailValidator = debounce(() => validateEmail(emailInput, emailFeedback), 500);

    // Attach event listeners for real-time validation on user input
    firstNameInput.addEventListener('input', () => validateName(firstNameInput, firstNameFeedback, 'First name'));
    lastNameInput.addEventListener('input', () => validateName(lastNameInput, lastNameFeedback, 'Last name'));
    emailInput.addEventListener('input', debouncedEmailValidator);
    phoneInput.addEventListener('input', () => validatePhoneNumber(phoneInput, phoneFeedback));
    passwordInput.addEventListener('input', () => {
        validatePassword(passwordInput, passwordFeedback);
        // Also re-validate the confirmation field whenever the main password changes
        validateConfirmPassword(passwordInput, confirmPasswordInput, confirmPasswordFeedback);
    });
    confirmPasswordInput.addEventListener('input', () => validateConfirmPassword(passwordInput, confirmPasswordInput, confirmPasswordFeedback));

    // Restrict phone number input to only numbers
    phoneInput.addEventListener('keydown', (e) => {
        if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
    });

    // Handle form submission
    signupForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        messageArea.textContent = '';
        messageArea.style.color = 'red';

        // Run all validations one last time to be sure
        const isFirstNameValid = validateName(firstNameInput, firstNameFeedback, 'First name');
        const isLastNameValid = validateName(lastNameInput, lastNameFeedback, 'Last name');
        const isEmailValid = await validateEmail(emailInput, emailFeedback);
        const isPhoneValid = validatePhoneNumber(phoneInput, phoneFeedback);
        const isPasswordValid = validatePassword(passwordInput, passwordFeedback);
        const isConfirmPasswordValid = validateConfirmPassword(passwordInput, confirmPasswordInput, confirmPasswordFeedback);
        
        // If any validation fails, stop the submission
        if (!isFirstNameValid || !isLastNameValid || !isEmailValid || !isPhoneValid || !isPasswordValid || !isConfirmPasswordValid) {
            messageArea.textContent = 'Please fix the errors above before submitting.';
            return;
        }

        const formData = new FormData(signupForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/post', { // Server registration endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();

            if (response.ok && result.success) {
                updateFeedback(messageArea, result.message || 'Registration successful! Please check your email.', true);
                signupForm.reset();
                // Clear all individual feedback messages on success
                [firstNameFeedback, lastNameFeedback, emailFeedback, phoneFeedback, passwordFeedback, confirmPasswordFeedback].forEach(el => updateFeedback(el, '', true));
            } else {
                updateFeedback(messageArea, result.error || 'An unknown server error occurred.', false);
            }
        } catch (error) {
            console.error('Signup form submission error:', error);
            updateFeedback(messageArea, 'A network error occurred. Please try again.', false);
        }
    });
}