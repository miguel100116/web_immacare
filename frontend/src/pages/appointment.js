// frontend/src/pages/appointment.js

document.addEventListener('DOMContentLoaded', async function() {
    // --- 1. USER INFO LOGIC ---
    try {
        const response = await fetch('/getUser');
        const userData = await response.json();
        if (userData.loggedIn) {
            const fieldsToLock = { patientName: userData.fullname, age: userData.age, phone: userData.phoneNumber, address: userData.address };
            for (const id in fieldsToLock) {
                const input = document.getElementById(id);
                const value = fieldsToLock[id];
                const changeButton = document.querySelector(`.edit-btn[data-target="${id}"]`);
                if (input && value) {
                    input.value = value;
                    input.readOnly = true;
                    input.classList.add('pre-filled');
                } else if (changeButton) {
                    changeButton.style.display = 'none';
                }
            }
        } else {
            document.querySelectorAll('.edit-btn').forEach(btn => btn.style.display = 'none');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        document.querySelectorAll('.edit-btn').forEach(btn => btn.style.display = 'none');
    }
    
    document.querySelectorAll('.edit-btn').forEach(button => {
        const targetInputId = button.dataset.target;
        const inputToEdit = document.getElementById(targetInputId);
        const relockField = () => {
            inputToEdit.readOnly = true;
            inputToEdit.classList.add('pre-filled');
            button.style.display = 'inline-block';
        };
        button.addEventListener('click', function() {
            inputToEdit.readOnly = false;
            inputToEdit.classList.remove('pre-filled');
            inputToEdit.focus();
            this.style.display = 'none';
        });
        inputToEdit.addEventListener('blur', relockField);
        inputToEdit.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                relockField();
            }
        });
    });

    // --- 2. DYNAMIC APPOINTMENT FORM LOGIC ---
    const specializationSelect = document.getElementById('specialization');
    const doctorSelect = document.getElementById('doctorName');

    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');

    async function updateAvailableTimes() {
        const doctorId = doctorSelect.value;
        const selectedDate = dateInput.value;

        // Reset all time options to be enabled first
        for (const option of timeSelect.options) {
            option.disabled = false;
            option.textContent = option.value; // Reset text
        }
        
        // Only proceed if we have both a doctor and a date
        if (!doctorId || !selectedDate) {
            return;
        }

        try {
            const response = await fetch(`/api/booked-times?doctorId=${doctorId}&date=${selectedDate}`);
            if (!response.ok) throw new Error('Failed to fetch booked times');
            
            const bookedTimes = await response.json(); // e.g., ["09:00 AM", "11:30 AM"]

            // Loop through the time options and disable the ones that are booked
            for (const option of timeSelect.options) {
                if (bookedTimes.includes(option.value)) {
                    option.disabled = true;
                    option.textContent = `${option.value} (Booked)`;
                }
            }

        } catch (error) {
            console.error(error);
            // Optionally show an error to the user
        }
    }

    // Function to fetch and populate specializations
    async function populateSpecializations() {
        try {
            const response = await fetch('/api/specializations');
            if (!response.ok) throw new Error('Failed to fetch specializations');
            const specializations = await response.json();

            specializationSelect.innerHTML = '<option value="">Select Specialization</option>'; // Reset
            specializations.forEach(spec => {
                const option = new Option(spec.name, spec._id);
                specializationSelect.add(option);
            });
        } catch (error) {
            console.error(error);
            specializationSelect.innerHTML = '<option value="">Could not load specializations</option>';
        }
    }

    // Function to fetch doctors based on selected specialization
    async function updateDoctorOptions() {
    const selectedSpecId = specializationSelect.value;
    doctorSelect.innerHTML = ''; 
    
    if (selectedSpecId) {
        doctorSelect.disabled = false;
        doctorSelect.innerHTML = '<option value="">Loading doctors...</option>';
        try {
            const response = await fetch(`/api/doctors?specializationId=${selectedSpecId}`);
            if (!response.ok) throw new Error('Failed to fetch doctors');
            const doctors = await response.json();

            doctorSelect.innerHTML = '<option value="">Select a Doctor</option>'; 
            if (doctors.length > 0) {
                doctors.forEach(doctor => {
                    // --- THE FIX ---
                    // The visible text is the doctor's name.
                    // The SUBMITTED VALUE is now the doctor's own _id.
                    const option = new Option(doctor.userAccount.fullname, doctor._id);
                    doctorSelect.add(option);
                });
                if (doctors.length === 1) {
                    doctorSelect.value = doctors[0]._id; // Auto-select by ID
                }
            } else {
               doctorSelect.innerHTML = '<option value="">No doctors available</option>';
            }
        } catch (error) {
            console.error(error);
            doctorSelect.innerHTML = '<option value="">Could not load doctors</option>';
        }
    } else {
        doctorSelect.disabled = true;
        doctorSelect.innerHTML = '<option value="">Select a specialization first</option>';
    }
}


    // Attach event listener and make initial calls
    specializationSelect.addEventListener('change', async () => {
        await updateDoctorOptions();
        await updateAvailableTimes();
    });
    await populateSpecializations(); 
    
    doctorSelect.addEventListener('change', updateAvailableTimes);
    dateInput.addEventListener('change', updateAvailableTimes);

    // --- 3. URL PARAMS LOGIC ---
    async function setupFormFromUrl() {
        await populateSpecializations();
        const urlParams = new URLSearchParams(window.location.search);
        //... (rest of your url param logic is fine)
        
        if (specIdParam) {
            specializationSelect.value = specIdParam;
            await updateDoctorOptions();
            if (doctorIdParam) {
                doctorSelect.value = doctorIdParam;
            }
        }
        
        // After setting up from URL, run the time check once
        await updateAvailableTimes();
    }
    
    // Run the setup
    setupFormFromUrl();
    const specIdParam = urlParams.get('specialization');
    const doctorIdParam = urlParams.get('doctor'); // It's now an ID, not a name
    const errorMsg = urlParams.get('error');

    if (errorMsg) {
        document.getElementById('form-message-area').textContent = decodeURIComponent(errorMsg);
        document.getElementById('form-message-area').style.color = 'red';
    }

    if (specIdParam) {
        // Set the specialization dropdown to the correct value
        specializationSelect.value = specIdParam;
        
        // Trigger the update for the doctor dropdown and WAIT for it to load
        await updateDoctorOptions();
        
        // 4. AFTER the doctors are loaded, if a doctor ID was also passed...
        if (doctorIdParam) {
            // Set the doctor dropdown to the correct doctor ID
            doctorSelect.value = doctorIdParam;
        }
    }

    const appointmentForm = document.getElementById('userDataForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', async function(event) {
            // ALWAYS prevent the default browser submission. We are in control now.
            event.preventDefault();

            // Find the submit button and disable it to prevent multiple clicks
            const submitButton = appointmentForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';

            // Gather all data from the form into a simple object
            const formData = new FormData(appointmentForm);
            const data = Object.fromEntries(formData.entries());

            // --- Final Validation ---
            if (!data.specialization || !data.doctor || !data.date || !data.time) {
                alert('Please ensure all required fields are filled out.');
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Appointment';
                return;
            }

            console.log('✅ Form is valid. Sending this data to the backend:', data);

            try {
                // Send the data to the backend using fetch
                const response = await fetch('/save-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                // Check if the server responded with an error status
                if (!response.ok) {
                    // Try to get a specific error message from the backend
                    const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
                    throw new Error(errorData.error || `Server responded with status: ${response.status}`);
                }

                // If the submission was successful, the backend will have redirected.
                // The browser follows the redirect, and `response.url` will be the new page.
                if (response.redirected) {
                    // Manually navigate to the success page.
                    window.location.href = response.url;
                } else {
                    // This case shouldn't happen with your backend, but it's good practice
                    // to handle it.
                    alert('Appointment submitted, but failed to redirect.');
                }

            } catch (error) {
                // This will catch network errors or errors thrown from the !response.ok check
                console.error('❌ Submission failed:', error);
                document.getElementById('form-message-area').textContent = error.message;
                document.getElementById('form-message-area').style.color = 'red';
                
                // Re-enable the button so the user can try again
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Appointment';
            }
        });
    }
});