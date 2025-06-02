document.addEventListener('DOMContentLoaded', function() {
    // This function will check the server session and load initial data
    initializeApp();

    // Basic UI initializations (sidebar navigation, modal toggles)
    initializeBaseUIEventListeners();
});

async function initializeApp() {
    // 1. Verify admin session and get user info (like fullname)
    try {
        const response = await fetch('/getUser'); // Your existing endpoint
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error fetching user session:', response.status, errorText);
            // If server denied or errored, redirect to main login
            window.location.href = `/login.html?message=Session_error_admin_(${response.status})`;
            return;
        }
        const userData = await response.json();

        if (userData.loggedIn && userData.isAdmin) {
            const adminUserFullnameEl = document.getElementById('admin-user-fullname');
            if (adminUserFullnameEl && userData.fullname) {
                adminUserFullnameEl.textContent = userData.fullname;
            }
            // User is an authenticated admin, proceed to load dashboard data
            await loadAllAdminData(); // Make sure this completes before further UI updates if needed
        } else {
            // Not logged in or not an admin, redirect to main application login
            console.log('User not admin or not logged in, redirecting from admin panel.');
            window.location.href = '/login.html?message=Admin_access_required';
        }
    } catch (error) {
        console.error('Failed to verify admin session or load initial data:', error);
        window.location.href = '/login.html?message=Failed_to_verify_session_or_load_data';
    }
}

function initializeBaseUIEventListeners() {
    // Navigation functionality for switching content sections
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');

            contentSections.forEach(section => section.classList.remove('active'));
            const targetId = this.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // Toggle sidebar on mobile
    const toggleMenu = document.querySelector('.toggle-menu');
    const sidebar = document.querySelector('.sidebar');
    if (toggleMenu && sidebar) {
        toggleMenu.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }

    // Logout is handled by href="/logout" in admin.html for server-side session destruction.
    // The #logout-button in admin.html has href="/logout"

    // Basic Modal handling (opening, closing)
    initializeModalEventListeners();
    setupSearchListeners();
}

async function loadAllAdminData() {
    // Fetch all necessary data concurrently
    try {
        const [users, appointments] = await Promise.all([
            fetchAndStoreUsers(),
            fetchAndStoreAppointments()
            // Future: fetchAndStorePayments(), fetchAndStoreInventory()
        ]);

        // Now display them
        if (users) displayUsersTable(users);
        if (appointments) displayAppointmentsTable(appointments);

        updateDashboardStats({
            users: users ? users.length : 0,
            appointments: appointments ? appointments.length : 0
            // payments: 0, // Placeholder
            // inventory: 0  // Placeholder
        });

    } catch (error) {
        console.error("Error loading admin data:", error);
        // Display a general error message on the dashboard or relevant sections
        const dashboardSection = document.getElementById('dashboard');
        if(dashboardSection) {
            const errorDiv = document.createElement('div');
            errorDiv.textContent = "Error loading dashboard data. Please try again later.";
            errorDiv.style.color = "red";
            errorDiv.style.padding = "20px";
            dashboardSection.prepend(errorDiv);
        }
    }
}


// --- USERS ---
let allUsersDataCache = []; // Cache for client-side searching

async function fetchAndStoreUsers() {
    try {
        const response = await fetch('/api/admin/users'); // API endpoint from server.js
        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
        }
        allUsersDataCache = await response.json();
        return allUsersDataCache;
    } catch (error) {
        console.error('Error fetching users:', error);
        const tableBody = document.querySelector('#users-table tbody');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error loading users.</td></tr>';
        return null; // Indicate failure
    }
}

function displayUsersTable(users) {
    const tableBody = document.querySelector('#users-table tbody');
    if (!tableBody) {
        console.error("User table body not found!");
        return;
    }
    tableBody.innerHTML = ''; // Clear existing rows

    if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No users found.</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = user.fullname || 'N/A';
        row.insertCell().textContent = user.signupEmail || 'N/A';
        row.insertCell().textContent = user.PhoneNumber || 'N/A';
        row.insertCell().textContent = user.Age || 'N/A';
        row.insertCell().textContent = user.Sex || 'N/A';
        row.insertCell().innerHTML = user.isVerified ? '<span class="status-badge status-completed">Yes</span>' : '<span class="status-badge status-pending">No</span>';
        row.insertCell().innerHTML = user.isAdmin ? '<span class="status-badge status-admin">Yes</span>' : '<span class="status-badge status-user">No</span>';
        // Actions cell (for future edit/delete)
        // const actionsCell = row.insertCell();
        // actionsCell.innerHTML = `<button class="edit-btn" data-id="${user._id}" data-type="user"><i class="fas fa-edit"></i></button>`;
    });
}

// --- APPOINTMENTS ---
let allAppointmentsDataCache = []; // Cache for client-side searching

async function fetchAndStoreAppointments() {
    try {
        const response = await fetch('/api/admin/appointments'); // API endpoint from server.js
        if (!response.ok) {
            throw new Error(`Failed to fetch appointments: ${response.status} ${response.statusText}`);
        }
        allAppointmentsDataCache = await response.json();
        return allAppointmentsDataCache;
    } catch (error) {
        console.error('Error fetching appointments:', error);
        const tableBody = document.querySelector('#appointments-table tbody');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error loading appointments.</td></tr>';
        return null; // Indicate failure
    }
}

function displayAppointmentsTable(appointments) {
    const tableBody = document.querySelector('#appointments-table tbody');
    if (!tableBody) {
        console.error("Appointments table body not found!");
        return;
    }
    tableBody.innerHTML = '';

    if (!appointments || appointments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No appointments found.</td></tr>';
        return;
    }

    appointments.forEach(appt => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = appt.patientName || 'N/A';
        row.insertCell().textContent = appt.patientEmail || 'N/A'; // Ensure this field exists in your Appointment model
        row.insertCell().textContent = appt.doctorName || 'N/A';
        row.insertCell().textContent = appt.specialization || 'N/A';
        row.insertCell().textContent = appt.date ? new Date(appt.date).toLocaleDateString() : 'N/A';
        row.insertCell().textContent = appt.time || 'N/A';
        // Actions cell (for future edit/delete)
        // const actionsCell = row.insertCell();
        // actionsCell.innerHTML = `<button class="edit-btn" data-id="${appt._id}" data-type="appointment"><i class="fas fa-edit"></i></button>`;
    });
}

// --- DASHBOARD STATS ---
function updateDashboardStats(data = {}) {
    // console.log("Updating dashboard stats with:", data); // For debugging
    if (data.users !== undefined) {
        const usersCountEl = document.getElementById('dashboard-total-users');
        if (usersCountEl) usersCountEl.textContent = data.users;
    }
    if (data.appointments !== undefined) {
        const apptsCountEl = document.getElementById('dashboard-appointments-count');
        if (apptsCountEl) apptsCountEl.textContent = data.appointments;
    }
    // TODO: Update payment and inventory stats when those sections are implemented
    const paymentsTodayEl = document.getElementById('dashboard-payments-today');
    if (paymentsTodayEl && data.payments !== undefined) paymentsTodayEl.textContent = `₱${data.payments.toFixed(2)}`;
    else if (paymentsTodayEl) paymentsTodayEl.textContent = '₱0.00';


    const inventoryItemsEl = document.getElementById('dashboard-inventory-items');
    if (inventoryItemsEl && data.inventory !== undefined) inventoryItemsEl.textContent = data.inventory;
    else if (inventoryItemsEl) inventoryItemsEl.textContent = '0';
}

// --- SEARCH FUNCTIONALITY (Client-side for now) ---
function setupSearchListeners() {
    const usersSearchBtn = document.getElementById('users-search-btn');
    const usersSearchInput = document.getElementById('users-search');
    const appointmentsSearchBtn = document.getElementById('appointments-search-btn');
    const appointmentsSearchInput = document.getElementById('appointments-search');

    if (usersSearchBtn && usersSearchInput) {
        const performUserSearch = () => {
            const searchTerm = usersSearchInput.value.toLowerCase().trim();
            if (!searchTerm) {
                displayUsersTable(allUsersDataCache); // Show all if search is empty
                return;
            }
            const filteredUsers = allUsersDataCache.filter(user =>
                (user.fullname && user.fullname.toLowerCase().includes(searchTerm)) ||
                (user.signupEmail && user.signupEmail.toLowerCase().includes(searchTerm))
            );
            displayUsersTable(filteredUsers);
        };
        usersSearchBtn.addEventListener('click', performUserSearch);
        usersSearchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') performUserSearch();
        });
    }

    if (appointmentsSearchBtn && appointmentsSearchInput) {
        const performAppointmentSearch = () => {
            const searchTerm = appointmentsSearchInput.value.toLowerCase().trim();
             if (!searchTerm) {
                displayAppointmentsTable(allAppointmentsDataCache); // Show all if search is empty
                return;
            }
            const filteredAppointments = allAppointmentsDataCache.filter(appt =>
                (appt.patientName && appt.patientName.toLowerCase().includes(searchTerm)) ||
                (appt.patientEmail && appt.patientEmail.toLowerCase().includes(searchTerm)) ||
                (appt.doctorName && appt.doctorName.toLowerCase().includes(searchTerm)) ||
                (appt._id && appt._id.toLowerCase().includes(searchTerm)) // If appointments have _id
            );
            displayAppointmentsTable(filteredAppointments);
        };
        appointmentsSearchBtn.addEventListener('click', performAppointmentSearch);
        appointmentsSearchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') performAppointmentSearch();
        });
    }
}


// --- MODAL EVENT LISTENERS (Basic open/close) ---
function initializeModalEventListeners() {
    const modals = document.querySelectorAll('.modal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const modalTriggers = { // Define your actual modal trigger button IDs and corresponding modal IDs
        // 'add-new-user-btn': 'user-form-modal',
        // 'add-new-appointment-btn': 'appointment-form-modal',
    };

    Object.keys(modalTriggers).forEach(triggerId => {
        const triggerButton = document.getElementById(triggerId);
        if (triggerButton) {
            triggerButton.addEventListener('click', () => {
                const modalId = modalTriggers[triggerId];
                const modalElement = document.getElementById(modalId);
                if (modalElement) {
                    modalElement.style.display = 'flex';
                    // Optionally reset form inside modal here
                }
            });
        }
    });

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    modals.forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) { // Clicked on modal background
                modal.style.display = 'none';
            }
        });
    });

    // Example: Cancel buttons inside modals (if they have a common class or specific IDs)
    document.querySelectorAll('.modal .cancel-btn').forEach(cancelBtn => {
        cancelBtn.addEventListener('click', () => {
            const modal = cancelBtn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
}