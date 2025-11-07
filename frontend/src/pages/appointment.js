// frontend/src/pages/appointment.js
// This version is based on your working code and adds the new schedule logic.

document.addEventListener('DOMContentLoaded', async function() {
    // --- 1. SETUP ---
    // Global State
    let doctorSchedule = {};
    let flatpickrInstance = null;

    // DOM Elements
    const specializationSelect = document.getElementById('specialization');
    const doctorSelect = document.getElementById('doctorName');
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    const appointmentForm = document.getElementById('userDataForm');

    const step1 = document.getElementById('appointment-step-1');
    const step2 = document.getElementById('appointment-step-2');
    const nextBtn = document.getElementById('next-step-btn');
    const backBtn = document.getElementById('back-step-btn');

    // --- 2. INITIALIZATION ---
    initializeFlatpickr();
    await populateUserInfo();
    await populateSpecializations();
    await setupFormFromUrlParams();

    // Attach all event listeners
    specializationSelect.addEventListener('change', onSpecializationChange);
    doctorSelect.addEventListener('change', onDoctorChange);
    // The date change event is now handled by flatpickr's `onChange`
    nextBtn.addEventListener('click', goToStep2);
    backBtn.addEventListener('click', goToStep1);
    appointmentForm?.addEventListener('submit', handleFormSubmit);

    // --- 3. CORE FUNCTIONS ---

    function initializeFlatpickr() {
        flatpickrInstance = flatpickr(dateInput, {
            minDate: "today",
            altInput: true,
            altFormat: "F j, Y",
            dateFormat: "Y-m-d",
            disable: [
                function(date) {
                    // Disable all dates by default until a doctor is chosen
                    return true;
                }
            ],
            onChange: function(selectedDates, dateStr, instance) {
                // When a valid date is picked, update the time slots
                updateAvailableTimes(dateStr);
            },
        });
        // Set the initial placeholder correctly
        dateInput.placeholder = "Select a doctor first";
    }

    function goToStep1() {
        step1.style.display = 'block';
        step2.style.display = 'none';
    }

    function goToStep2() {
        // Validation before proceeding
        const specValue = specializationSelect.value;
        const doctorValue = doctorSelect.value;
        
        // --- THIS IS THE CHANGE: Use the new, step-specific message area ---
        const step1MessageArea = document.getElementById('step-1-message-area');
        step1MessageArea.textContent = ''; // Clear previous messages

        if (!specValue || !doctorValue) {
            let errorMessage = '';
            if (!specValue && !doctorValue) {
                errorMessage = 'Please select a specialization and a doctor.';
            } else if (!specValue) {
                errorMessage = 'Please select a specialization.';
            } else {
                errorMessage = 'Please select a doctor.';
            }
            
            step1MessageArea.textContent = errorMessage;
            return; // Stop the function
        }

        // If validation passes, switch views
        step1.style.display = 'none';
        step2.style.display = 'block';

        // Clear the main form message area just in case it had old errors
        document.getElementById('form-message-area').textContent = '';
    }

    async function checkForExistingAppointment(doctorId) {
        // This function will disable the "Next" button and show a message
        // if the user already has an appointment with the selected doctor.
        const nextButton = document.getElementById('next-step-btn');
        const step1MessageArea = document.getElementById('step-1-message-area');

        // Reset state first
        nextButton.disabled = false;
        step1MessageArea.textContent = '';

        try {
            const response = await fetch(`/api/appointments/check-existing?doctorId=${doctorId}`);

            if (response.status === 409) { // 409 Conflict means an appointment exists
                const data = await response.json();
                step1MessageArea.textContent = data.message;
                nextButton.disabled = true; // IMPORTANT: Disable the next button
            } else if (!response.ok) {
                // For other errors, log it but don't block the user
                console.error('Error checking for existing appointment.');
            }
            // If response is 200 OK, do nothing, the button remains enabled.

        } catch (error) {
            console.error('Network error checking for existing appointment:', error);
        }
    }

    async function onSpecializationChange() {
        await updateDoctorOptions();
        // A new specialization means we need to reset the doctor schedule
        resetDoctorSchedule();
    }

    async function onDoctorChange() {
        const doctorId = doctorSelect.value;
        if (doctorId) {
            // --- ADD THIS LINE ---
            await checkForExistingAppointment(doctorId); // Check for existing appointments first
            
            // Then proceed with fetching the schedule
            await fetchAndApplyDoctorSchedule(doctorId);
        } else {
            resetDoctorSchedule();
            // Also reset the button and message area if no doctor is selected
            document.getElementById('next-step-btn').disabled = false;
            document.getElementById('step-1-message-area').textContent = '';
        }
    }


    async function fetchAndApplyDoctorSchedule(doctorId) {
        try {
            const response = await fetch(`/api/schedule/${doctorId}`);
            if (!response.ok) throw new Error('Could not load schedule.');
            
            doctorSchedule = await response.json();
            
            const availableWeekdays = Object.keys(doctorSchedule).filter(day => doctorSchedule[day].length > 0);
            const dayNameToNum = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

            // Reconfigure flatpickr to only enable available days
            flatpickrInstance.set('disable', [
                function(date) {
                    const dayNum = date.getDay();
                    const dayName = Object.keys(dayNameToNum).find(key => dayNameToNum[key] === dayNum);
                    return !availableWeekdays.includes(dayName);
                }
            ]);
            dateInput.placeholder = "Select an available date";

        } catch (error) {
            console.error(error);
            resetDoctorSchedule(); // Reset on error
        }
    }

    function updateAvailableTimes(selectedDate) {
        timeSelect.innerHTML = '<option value="">Select Time</option>';
        timeSelect.disabled = true;

        if (!selectedDate || Object.keys(doctorSchedule).length === 0) {
            return;
        }

        const dayOfWeek = new Date(selectedDate + 'T00:00:00').toLocaleString('en-US', { weekday: 'long' });
        const availableSlots = doctorSchedule[dayOfWeek] || [];

        if (availableSlots.length > 0) {
            // Populate the time dropdown ONLY with valid slots for that day
            availableSlots.forEach(time => {
                timeSelect.add(new Option(time, time));
            });
            timeSelect.disabled = false;
        } else {
            timeSelect.innerHTML = '<option value="">Doctor unavailable on this day</option>';
        }
        
        // After populating, check against already booked appointments
        checkIfTimesAreBooked(selectedDate);
    }
    
    async function checkIfTimesAreBooked(selectedDate) {
        const doctorId = doctorSelect.value;
        if (!doctorId || !selectedDate) return;

        try {
            const response = await fetch(`/api/booked-times?doctorId=${doctorId}&date=${selectedDate}`);
            if (!response.ok) return;
            const bookedTimes = await response.json();

            for (const option of timeSelect.options) {
                if (bookedTimes.includes(option.value)) {
                    option.disabled = true;
                    option.textContent = `${option.value} (Booked)`;
                }
            }
        } catch (error) {
            console.error('Error checking booked times:', error);
        }
    }
    
    function resetDoctorSchedule() {
        doctorSchedule = {};
        flatpickrInstance.clear();
        flatpickrInstance.set('disable', [function(date) { return true; }]);
        dateInput.placeholder = "Select a doctor first";
        timeSelect.innerHTML = '<option value="">Select a date first</option>';
        timeSelect.disabled = true;
    }


    // --- 4. HELPER AND FORM SUBMISSION FUNCTIONS (These are from your working file) ---

    async function populateSpecializations() {
        try {
            const response = await fetch('/api/specializations');
            if (!response.ok) throw new Error('Failed to fetch specializations');
            const specializations = await response.json();
            specializationSelect.innerHTML = '<option value="">Select Specialization</option>';
            specializations.forEach(spec => {
                specializationSelect.add(new Option(spec.name, spec._id));
            });
        } catch (error) {
            console.error(error);
            specializationSelect.innerHTML = '<option value="">Could not load specializations</option>';
        }
    }

    async function updateDoctorOptions() {
        const selectedSpecId = specializationSelect.value;
        doctorSelect.innerHTML = '<option value="">Select a specialization first</option>';
        doctorSelect.disabled = true;
        
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
                        doctorSelect.add(new Option(doctor.userAccount.fullname, doctor._id));
                    });
                } else {
                    doctorSelect.innerHTML = '<option value="">No doctors available</option>';
                }
            } catch (error) {
                console.error(error);
                doctorSelect.innerHTML = '<option value="">Could not load doctors</option>';
            }
        }
    }
    
    async function setupFormFromUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const specIdParam = urlParams.get('specialization');
        const doctorIdParam = urlParams.get('doctor');
        const reasonParam = urlParams.get('reason'); // <-- New
        const rescheduleIdParam = urlParams.get('rescheduleOf'); // <-- New
        const errorMsg = urlParams.get('error');

        if (errorMsg) {
            document.getElementById('form-message-area').textContent = decodeURIComponent(errorMsg);
            document.getElementById('form-message-area').style.color = 'red';
        }

        // Pre-fill the reason if it exists
        if (reasonParam) {
            document.getElementById('reason').value = decodeURIComponent(reasonParam);
        }

        // Add a hidden input to the form to track the original appointment ID
        if (rescheduleIdParam) {
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'rescheduleOf';
            hiddenInput.value = rescheduleIdParam;
            appointmentForm.appendChild(hiddenInput);
        }

        if (specIdParam) {
            specializationSelect.value = specIdParam;
            await updateDoctorOptions();
            if (doctorIdParam) {
                doctorSelect.value = doctorIdParam;
                await onDoctorChange();
            }
        }
    }
    
    // This is your working user info logic, unchanged.
    async function populateUserInfo() {
        try {
            const response = await fetch('/getUser');
            const userData = await response.json();
            if (userData.loggedIn) {
                const fieldsToLock = {  
                    patientFirstName: userData.firstName, 
                    patientLastName: userData.lastName,
                    patientSuffix: userData.suffix,
                    age: userData.age, 
                    phone: userData.phoneNumber, 
                    address: userData.address 
                };
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
    }

    // This is your working form submission logic, unchanged.
    async function handleFormSubmit(event) {
        event.preventDefault();
        const submitButton = appointmentForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        const formData = new FormData(appointmentForm);
        const data = Object.fromEntries(formData.entries());
        if (data.doctorName) {
            data.doctor = data.doctorName;
            delete data.doctorName;
        }
        if (!data.specialization || !data.doctor || !data.date || !data.time) {
            alert('Please ensure all required fields are filled out.');
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Appointment';
            return;
        }
        try {
            const response = await fetch('/api/appointments/save-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
                throw new Error(errorData.error || `Server responded with status: ${response.status}`);
            }
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                alert('Appointment submitted, but failed to redirect.');
            }
        } catch (error) {
            console.error('❌ Submission failed:', error);
            document.getElementById('form-message-area').textContent = error.message;
            document.getElementById('form-message-area').style.color = 'red';
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Appointment';
        }
    }
});