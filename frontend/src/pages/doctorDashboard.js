// frontend/src/pages/doctorDashboard.js

// Global cache for appointments to enable client-side searching
let allAppointments = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    loadDoctorData();
});

/**
 * Sets up all interactive UI elements.
 */
function initializeUI() {
    // Tab switching
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            contentSections.forEach(section => {
                section.style.display = section.id === targetId ? 'block' : 'none';
            });
        });
    });

    // Appointment search
    const searchInput = document.getElementById('appointments-search');
    const searchBtn = document.getElementById('appointments-search-btn');
    searchBtn.addEventListener('click', handleAppointmentSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleAppointmentSearch();
    });

    // Form Submissions
    document.getElementById('profile-form')?.addEventListener('submit', handleProfileUpdate);
    document.getElementById('schedule-form')?.addEventListener('submit', handleScheduleUpdate);

    // --- CHANGE: Add "Change" button functionality ---
    initializeEditableFields();
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-profile-btn');
    const messageArea = document.getElementById('profile-message-area');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    messageArea.className = 'message-area';

    // --- CHANGE: Gather data from all profile fields ---
    const formData = {
        firstName: document.getElementById('doctor-firstName').value,
        lastName: document.getElementById('doctor-lastName').value,
        suffix: document.getElementById('doctor-suffix').value,
        specialization: document.getElementById('doctor-specialization').value,
        description: document.getElementById('doctor-description').value.trim(),
    };

    try {
        // The backend route is the same, but it now accepts the new data
        const response = await fetch('/api/doctor/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Update failed.');

        messageArea.textContent = result.message;
        messageArea.className = 'message-area success';

        // --- CHANGE: Refresh the user name in the sidebar after a successful update ---
        await loadUserInfo();

    } catch (error) {
        messageArea.textContent = error.message;
        messageArea.className = 'message-area error';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
        // Re-lock all fields after submission
        document.querySelectorAll('#profile-form input, #profile-form textarea').forEach(el => {
            if(!el.closest('.form-group').querySelector('select')) { // Don't lock select
                 el.readOnly = true;
                 el.classList.add('pre-filled');
            }
        });
        document.querySelectorAll('#profile-form .edit-btn').forEach(btn => btn.style.display = 'inline-block');
    }
}

function initializeEditableFields() {
    document.querySelectorAll('#profile-form .edit-btn').forEach(button => {
        const targetInputId = button.dataset.target;
        const inputToEdit = document.getElementById(targetInputId);

        if (!inputToEdit) return;

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

/**
 * Orchestrates fetching all necessary data for the dashboard.
 */
async function loadDoctorData() {
    await Promise.all([
        loadUserInfo(),
        loadAppointments(),
        loadProfileForm(),
        loadScheduleForm() // New: Load the schedule management form
    ]);
}

/**
 * Fetches user info.
 */
async function loadUserInfo() {
    try {
        const response = await fetch('/getUser');
        if (!response.ok) throw new Error('Failed to fetch user data');
        const userData = await response.json();
        if (userData.loggedIn && userData.isDoctor) {
            document.getElementById('doctor-user-fullname').textContent = userData.fullname || 'Doctor';
        } else {
            window.location.href = '/login.html?message=Doctor_access_required.';
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        document.getElementById('doctor-user-fullname').textContent = 'Error Loading Name';
    }
}

/**
 * Fetches and displays appointments, sorting is handled by the backend.
 */
async function loadAppointments() {
    try {
        const response = await fetch('/api/doctor/appointments');
        if (!response.ok) throw new Error('Failed to fetch appointments');
        const appointments = await response.json();
        allAppointments = appointments; // Cache all appointments
        displayAppointments(allAppointments); // Display all initially
    } catch (error) {
        console.error("Error fetching appointments:", error);
        const tableBody = document.querySelector("#appointments-table tbody");
        tableBody.innerHTML = `<tr><td colspan="6" class="error-cell">Could not load appointments.</td></tr>`;
    }
}

/**
 * Handles the appointment search functionality.
 */
function handleAppointmentSearch() {
    const searchTerm = document.getElementById('appointments-search').value.toLowerCase().trim();
    if (!searchTerm) {
        displayAppointments(allAppointments); // Show all if search is empty
        return;
    }
    const filteredAppointments = allAppointments.filter(app =>
        app.patientName?.toLowerCase().includes(searchTerm)
    );
    displayAppointments(filteredAppointments);
}

/**
 * Renders a given list of appointments into the table.
 */
function displayAppointments(appointments) {
    const tableBody = document.querySelector("#appointments-table tbody");
    tableBody.innerHTML = ''; 

    if (!appointments || appointments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="no-data-cell">No appointments found.</td></tr>`;
        return;
    }

    appointments.forEach(app => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = app.patientName || 'N/A';
        const appointmentDate = new Date(app.date + 'T00:00:00');
        row.insertCell().textContent = appointmentDate.toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        row.insertCell().textContent = app.time || 'N/A';
        row.insertCell().textContent = app.reason || 'N/A';
        const statusCell = row.insertCell();
        statusCell.innerHTML = `<span class="status-badge status-${app.status.toLowerCase()}">${app.status}</span>`;
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `<button class="action-btn" title="View Details"><i class="fas fa-eye"></i></button>`;
    });
}

// --- PROFILE FORM LOGIC (Unchanged) ---
async function loadProfileForm() {
    try {
        // --- CHANGE: The backend route now returns all the data we need ---
        const [specResponse, profileResponse] = await Promise.all([
            fetch('/api/specializations'),
            fetch('/api/doctor/profile') // This response now includes the userAccount name
        ]);

        if (!specResponse.ok) throw new Error('Failed to load specializations.');
        if (!profileResponse.ok) throw new Error('Failed to load doctor profile.');

        const specializations = await specResponse.json();
        const profile = await profileResponse.json();

        // Populate Specialization dropdown (no change)
        const specSelect = document.getElementById('doctor-specialization');
        specSelect.innerHTML = '<option value="">-- Select a Specialization --</option>';
        specializations.forEach(spec => {
            if (spec.name !== 'Not Specified') {
                const option = document.createElement('option');
                option.value = spec._id;
                option.textContent = spec.name;
                specSelect.appendChild(option);
            }
        });
        if (profile.specialization) {
            specSelect.value = profile.specialization._id;
        }

        // Populate Description (no change)
        document.getElementById('doctor-description').value = profile.description || '';

        // --- CHANGE: Populate the new name fields and make them read-only ---
        const fieldsToPopulate = {
            'doctor-firstName': profile.userAccount?.firstName,
            'doctor-lastName': profile.userAccount?.lastName,
            'doctor-suffix': profile.userAccount?.suffix,
        };

        for (const id in fieldsToPopulate) {
            const input = document.getElementById(id);
            if (input) {
                input.value = fieldsToPopulate[id] || '';
                input.readOnly = true;
                input.classList.add('pre-filled');
            }
        }

    } catch (error) {
        console.error("Error setting up profile form:", error);
        document.getElementById('profile-message-area').className = 'message-area error';
        document.getElementById('profile-message-area').textContent = 'Error loading profile data.';
    }
}

// --- NEW SCHEDULE FORM LOGIC ---
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlots = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM"
];

async function loadScheduleForm() {
    const builder = document.getElementById('schedule-builder');
    builder.innerHTML = ''; // Clear previous

    // Create the HTML for the schedule builder (this part is correct)
    daysOfWeek.forEach(day => {
        const dayRow = document.createElement('div');
        dayRow.className = 'day-schedule-row';
        dayRow.dataset.day = day;

        let timeSlotsHtml = timeSlots.map(time => `
            <label class="time-slot">
                <input type="checkbox" value="${time}"> ${time}
            </label>
        `).join('');

        dayRow.innerHTML = `
            <label class="day-label">
                <input type="checkbox" class="day-toggle"> ${day}
            </label>
            <div class="schedule-grid">${timeSlotsHtml}</div>
        `;
        builder.appendChild(dayRow);
    });

    // Add event listeners to toggle day availability (this part is correct)
    builder.querySelectorAll('.day-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const row = e.target.closest('.day-schedule-row');
            row.classList.toggle('disabled', !e.target.checked);
            if (!e.target.checked) {
                row.querySelectorAll('.time-slot input').forEach(ts => ts.checked = false);
            }
        });
    });
    
    // Fetch existing schedule and correctly parse it to populate the form
    try {
        const response = await fetch('/api/doctor/profile');
        if (!response.ok) throw new Error('Could not load schedule');
        const profile = await response.json();

        // `profile.schedules` is now an array of strings like: ["Monday - 09:00 AM", "Tuesday - 01:00 PM"]
        if (profile.schedules && profile.schedules.length > 0) {
            profile.schedules.forEach(scheduleString => {
                // For each string, split it into day and time
                const parts = scheduleString.split(' - ');
                if (parts.length === 2) {
                    const day = parts[0];
                    const time = parts[1];

                    // Find the HTML row for that day
                    const dayRow = builder.querySelector(`.day-schedule-row[data-day="${day}"]`);
                    if (dayRow) {
                        // Check the main "day toggle" checkbox for this row
                        dayRow.querySelector('.day-toggle').checked = true;

                        // Find and check the specific time slot checkbox within that row
                        const timeSlotInput = dayRow.querySelector(`input[value="${time}"]`);
                        if (timeSlotInput) {
                            timeSlotInput.checked = true;
                        }
                    }
                }
            });
        }
        
        // After checking all the boxes, trigger the change event on each day toggle
        // to correctly set the initial enabled/disabled visual state of each row.
        builder.querySelectorAll('.day-toggle').forEach(t => t.dispatchEvent(new Event('change')));

    } catch(error) {
        console.error("Error loading schedule:", error);
    }
}

async function handleScheduleUpdate(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-schedule-btn');
    const messageArea = document.getElementById('schedule-message-area');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    messageArea.className = 'message-area';

    const newSchedules = [];
    document.querySelectorAll('.day-schedule-row').forEach(row => {
        const dayToggle = row.querySelector('.day-toggle');
        if (dayToggle.checked) {
            const dayOfWeek = row.dataset.day;
            const checkedTimeSlots = Array.from(row.querySelectorAll('.time-slot input:checked'))
                                          .map(input => input.value);

            if (checkedTimeSlots.length > 0) {
                newSchedules.push({ dayOfWeek, timeSlots: checkedTimeSlots });
            }
        }
    });

    try {
        const response = await fetch('/api/doctor/schedule', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedules: newSchedules })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Update failed.');
        
        messageArea.textContent = result.message;
        messageArea.className = 'message-area success';

    } catch (error) {
        messageArea.textContent = error.message;
        messageArea.className = 'message-area error';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Schedule';
    }
}