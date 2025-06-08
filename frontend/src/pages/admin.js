// frontend/src/pages/admin.js

// =====================================================================
// --- GLOBAL STATE & CONSTANTS ---
// =====================================================================
const dataCaches = {
    users: [],
    appointments: [],
    inventory: [],
    doctors: [],
    auditLog: []
};

let showingArchivedAppointments = false;
const ITEMS_PER_PAGE = 10;

// =====================================================================
// --- INITIALIZATION ---
// =====================================================================
document.addEventListener('DOMContentLoaded', function() {
    loadAllAdminData();
    initializeAdditionalUIEventListeners();
});

function initializeAdditionalUIEventListeners() {
    initializeModalEventListeners();
    setupSearchListeners();
    document.getElementById('add-new-appointment-btn')?.addEventListener('click', () => openAddAppointmentModal());
    document.getElementById('add-new-inventory-item-btn')?.addEventListener('click', () => openAddInventoryItemModal());
    document.getElementById('toggle-archived-view-btn')?.addEventListener('click', async () => {
        showingArchivedAppointments = !showingArchivedAppointments;
        const appointments = await fetchAndStoreAppointments();
        if (appointments) displayPaginatedTable('appointments', appointments, 1);
        updateArchivedButtonText();
        updateAppointmentsViewIndicator();
    });

    const dateFilterInput = document.getElementById('audit-log-date-filter');
    if (dateFilterInput) {
        flatpickr(dateFilterInput, {
            dateFormat: "Y-m-d",
            onChange: async function(selectedDates, dateStr, instance) {
                const logs = await fetchAndStoreAuditLogs(dateStr);
                displayPaginatedTable('auditLog', logs, 1);
            }
        });
    }
    document.getElementById('audit-log-clear-filter-btn')?.addEventListener('click', async () => {
        // Clear the calendar input visually
        if (dateFilterInput) {
            flatpickr(dateFilterInput).clear();
        }
        // Fetch ALL logs again by calling with no date
        const allLogs = await fetchAndStoreAuditLogs(); 
        // Display the complete, unfiltered log list
        displayPaginatedTable('auditLog', allLogs, 1); 
    });
}

async function loadAllAdminData() {
    try {
        const [users, appointments, inventoryItems, doctors, auditLogs] = await Promise.all([
            fetchAndStoreUsers(),
            fetchAndStoreAppointments(),
            fetchAndStoreInventoryItems(),
            fetchAndStoreDoctors(),
            fetchAndStoreAuditLogs(),
        ]);

        if (users) displayPaginatedTable('users', users, 1);
        if (appointments) displayPaginatedTable('appointments', appointments, 1);
        if (inventoryItems) displayPaginatedTable('inventory', inventoryItems, 1);
        if (doctors) displayPaginatedTable('doctors', doctors, 1);
        if (auditLogs) {
            console.log("Calling displayPaginatedTable for 'auditLog'");
            displayPaginatedTable('auditLog', auditLogs, 1);
        } else {
            console.error("'auditLogs' data is null or undefined after fetching.");
        }

        updateDashboardStats({
            users: users?.length || 0,
            appointments: appointments?.length || 0,
            inventory: inventoryItems?.length || 0
        });
        updateArchivedButtonText();
        updateAppointmentsViewIndicator();
    } catch (error) {
        console.error("Error loading admin data:", error);
    }
}


// =====================================================================
// --- PAGINATION & DISPLAY LOGIC ---
// =====================================================================

function displayPaginatedTable(type, data, page = 1) {
    const tableBody = document.querySelector(`#${type}-table tbody`);
    const paginationControls = document.getElementById(`${type}-pagination`);
    const renderRowFunction = window[`render${capitalize(type)}Row`];

    if (!tableBody || !paginationControls || typeof renderRowFunction !== 'function') {
        console.error(`Pagination setup missing for type: "${type}"`);
        return;
    }

    tableBody.innerHTML = '';
    
    if (!data || data.length === 0) {
        const colSpan = tableBody.parentElement.querySelector('thead tr')?.cells.length || 1;
        tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 20px;">No data found.</td></tr>`;
        paginationControls.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    page = Math.max(1, Math.min(page, totalPages));
    const start = (page - 1) * ITEMS_PER_PAGE;
    const paginatedItems = data.slice(start, start + ITEMS_PER_PAGE);

    paginatedItems.forEach(item => renderRowFunction(tableBody, item));
    renderPaginationControls(paginationControls, page, totalPages, type, data);
}

function renderAuditLogRow(tableBody, log) {
    const row = tableBody.insertRow();
    const timestamp = new Date(log.createdAt);
    row.insertCell().textContent = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;
    row.insertCell().textContent = log.actorName || 'System';
    row.insertCell().innerHTML = `<span class="status-badge status-log">${log.action.replace(/_/g, ' ')}</span>`;
    row.insertCell().textContent = log.details || 'N/A';
}


function renderPaginationControls(container, currentPage, totalPages, type, originalData) {
    container.innerHTML = `
        <div class="page-info">
            Showing <strong>${Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, originalData.length)}</strong>
            to <strong>${Math.min(currentPage * ITEMS_PER_PAGE, originalData.length)}</strong>
            of <strong>${originalData.length}</strong> entries
        </div>
        <div class="nav-buttons">
            <button class="prev-btn" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            <span>Page ${currentPage} of ${totalPages}</span>
            <button class="next-btn" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
    `;
    container.querySelector('.prev-btn').addEventListener('click', () => displayPaginatedTable(type, originalData, currentPage - 1));
    container.querySelector('.next-btn').addEventListener('click', () => displayPaginatedTable(type, originalData, currentPage + 1));
}

// --- ROW RENDERERS ---
// frontend/src/pages/admin.js

// --- Find and replace ONLY the renderUsersRow function ---

function renderUsersRow(tableBody, user) {
    const row = tableBody.insertRow();
    row.insertCell().textContent = user.firstName || 'N/A';
    row.insertCell().textContent = user.lastName || 'N/A';
    row.insertCell().textContent = user.signupEmail || 'N/A';
    row.insertCell().textContent = user.PhoneNumber || 'N/A';
    row.insertCell().textContent = user.Age || 'N/A';
    row.insertCell().textContent = user.Sex || 'N/A';
    row.insertCell().innerHTML = `<span class="status-badge status-${user.isVerified ? 'yes' : 'no'}">${user.isVerified ? 'Yes' : 'No'}</span>`;
    row.insertCell().innerHTML = `<span class="status-badge status-${user.isAdmin ? 'admin' : 'user'}">${user.isAdmin ? 'Yes' : 'No'}</span>`;
    row.insertCell().innerHTML = `<span class="status-badge status-staff-${user.isStaff ? 'yes' : 'no'}">${user.isStaff ? 'Yes' : 'No'}</span>`;
    
    const actionsCell = row.insertCell();
    let buttonsHtml = '';

    // --- NEW, MUTUALLY EXCLUSIVE LOGIC ---

    // 1. Determine if the "Promote to Doctor" button should be enabled.
    const canPromoteToDoctor = !user.isDoctor && !user.isStaff;
    if (user.isDoctor) {
        buttonsHtml += `<span class="status-badge status-doctor">Doctor</span>`;
    } else {
        buttonsHtml += `
            <button 
                class="action-btn promote-btn" 
                data-user-id="${user._id}" 
                data-user-name="${user.fullname}" 
                title="${canPromoteToDoctor ? 'Promote to Doctor' : 'User is Staff, cannot be a Doctor'}" 
                ${!canPromoteToDoctor ? 'disabled' : ''}>
                <i class="fas fa-user-md"></i>
            </button>`;
    }

    // 2. Determine if the "Toggle Staff" button should be enabled.
    // A user can be promoted to staff ONLY if they are not a doctor.
    // A user can ALWAYS be demoted from staff.
    const canToggleStaff = !user.isDoctor || user.isStaff;
    const staffIcon = user.isStaff ? 'fa-user-slash' : 'fa-user-plus';
    const staffTitle = user.isStaff ? 'Demote from Staff' : 
                       (canToggleStaff ? 'Promote to Staff' : 'User is a Doctor, cannot be Staff');

    buttonsHtml += `
        <button 
            class="action-btn toggle-staff-btn" 
            data-user-id="${user._id}" 
            data-user-name="${user.fullname}" 
            title="${staffTitle}" 
            ${!canToggleStaff ? 'disabled' : ''}>
            <i class="fas ${staffIcon}"></i>
        </button>`;
    
    actionsCell.innerHTML = buttonsHtml;

    // 3. Add event listeners (these will only work on non-disabled buttons)
    actionsCell.querySelector('.promote-btn')?.addEventListener('click', (e) => {
        if (e.currentTarget.disabled) return;
        promoteUserToDoctor(e.currentTarget.dataset.userId, e.currentTarget.dataset.userName);
    });
    
    actionsCell.querySelector('.toggle-staff-btn')?.addEventListener('click', (e) => {
        if (e.currentTarget.disabled) return;
        toggleStaffStatus(e.currentTarget.dataset.userId, e.currentTarget.dataset.userName);
    });
    // --- END OF NEW LOGIC ---
}

async function toggleStaffStatus(userId, userName) {
    const user = dataCaches.users.find(u => u._id === userId);
    const action = user?.isStaff ? 'demote' : 'promote';

    if (!confirm(`Are you sure you want to ${action} "${userName}" ${action === 'promote' ? 'to' : 'from'} Staff?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}/toggle-staff`, {
            method: 'POST',
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to update staff status.');
        }
        alert(result.message);
        // Refresh the users table to show the change
        const users = await fetchAndStoreUsers();
        displayPaginatedTable('users', users, 1);
    } catch (error) {
        console.error('Error toggling staff status:', error);
        alert(`Error: ${error.message}`);
    }
}

function renderAppointmentsRow(tableBody, appt) {
    const row = tableBody.insertRow();
    if (appt.isArchived) row.classList.add('archived-row');

    row.insertCell().textContent = appt.patientName || 'N/A';
    row.insertCell().textContent = appt.patientEmail || 'N/A';
    row.insertCell().textContent = appt.doctorName || 'N/A';
    row.insertCell().textContent = appt.date ? new Date(appt.date).toLocaleDateString() : 'N/A';
    row.insertCell().textContent = appt.time || 'N/A';

    const statusCell = row.insertCell();
    const statusText = appt.status || 'Scheduled';
    statusCell.innerHTML = `<span class="status-badge status-${statusText.toLowerCase()}">${statusText}</span>`;

    const actionsCell = row.insertCell();
    const archiveButtonIcon = appt.isArchived ? 'fa-box-open' : 'fa-archive';
    actionsCell.innerHTML = `
        <button class="action-btn toggle-status-btn" data-id="${appt._id}" data-current-status="${statusText}" title="Toggle Status" ${appt.isArchived ? 'disabled' : ''}><i class="fas fa-exchange-alt"></i></button>
        <button class="action-btn archive-btn" data-id="${appt._id}" title="${appt.isArchived ? 'Unarchive' : 'Archive'}"><i class="fas ${archiveButtonIcon}"></i></button>
    `;
    actionsCell.querySelector('.toggle-status-btn')?.addEventListener('click', (e) => toggleAppointmentStatus(e.currentTarget.dataset.id, e.currentTarget.dataset.currentStatus));
    actionsCell.querySelector('.archive-btn')?.addEventListener('click', (e) => archiveAppointment(e.currentTarget.dataset.id, appt.isArchived));
}

function renderDoctorsRow(tableBody, doctor) {
    const row = tableBody.insertRow();
    row.insertCell().textContent = doctor.userAccount?.firstName || 'N/A';
    row.insertCell().textContent = doctor.userAccount?.lastName || 'N/A';
    row.insertCell().textContent = doctor.userAccount?.signupEmail || 'N/A';
    row.insertCell().textContent = doctor.specialization?.name || 'Not Specified';
    
    const profileStatus = (doctor.specialization?.name !== 'Not Specified' && doctor.schedules?.length > 0) 
        ? '<span class="status-badge status-completed">Complete</span>'
        : '<span class="status-badge status-pending">Pending</span>';
    row.insertCell().innerHTML = profileStatus;

    // --- UPDATE THIS ACTIONS CELL ---
    const actionsCell = row.insertCell();
    actionsCell.innerHTML = `
        <button class="action-btn demote-doctor-btn" data-doctor-id="${doctor._id}" data-user-name="${doctor.userAccount?.firstName}" title="Remove Doctor Status">
            <i class="fas fa-user-slash"></i>
        </button>
    `;

    // Add event listener for the new demote button
    actionsCell.querySelector('.demote-doctor-btn').addEventListener('click', (e) => {
        const button = e.currentTarget;
        demoteDoctor(button.dataset.doctorId, button.dataset.userName);
    });

    // We can leave the edit listener commented out for now
    // actionsCell.querySelector('.edit-doctor-btn').addEventListener('click', () => openDoctorModalForEditing(doctor));
}

function renderInventoryRow(tableBody, item) {
    const row = tableBody.insertRow();
    row.insertCell().textContent = item.itemName || 'N/A';
    row.insertCell().textContent = item.quantity;
    const statusText = item.status || 'N/A';
    row.insertCell().innerHTML = `<span class="status-badge status-${statusText.toLowerCase().replace(/\s+/g, '-')}">${statusText}</span>`;
    row.insertCell().textContent = item.reorderLevel;
    row.insertCell().textContent = item.description || 'N/A';
    row.insertCell().textContent = new Date(item.updatedAt || item.createdAt).toLocaleDateString();
    const actionsCell = row.insertCell();
    actionsCell.innerHTML = `<button class="action-btn delete-btn" data-id="${item._id}" title="Delete"><i class="fas fa-trash"></i></button>`;
    actionsCell.querySelector('.delete-btn').addEventListener('click', (e) => deleteInventoryItem(e.currentTarget.dataset.id, item.itemName));
}

// =====================================================================
// --- DATA FETCHING & ACTIONS ---
// =====================================================================

// --- Data Fetchers ---

async function fetchAndStoreAuditLogs(date = null) {
    try {
        let url = '/api/admin/audit-logs';
        if (date) {
            url += `?date=${date}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        dataCaches.auditLog = await res.json();
        return dataCaches.auditLog;
    } catch (e) {
        console.error('Fetch Audit Logs Error:', e);
        return null;
    }
}

async function fetchAndStoreUsers() { 
    try { 
        const res = await fetch('/api/admin/users'); 
        if (!res.ok) throw new Error(res.statusText); 
        dataCaches.users = await res.json(); 
        return dataCaches.users; 
    } catch (e) { 
        console.error('Fetch Users Error:', e); 
        return null; 
    } 
}
async function fetchAndStoreAppointments() { 
    try { 
        const url = `/api/admin/appointments?archived=${showingArchivedAppointments}`; 
        const res = await fetch(url); if (!res.ok) throw new Error(res.statusText); 
        dataCaches.appointments = await res.json(); return dataCaches.appointments; 
    } catch (e) { 
        console.error('Fetch Appointments Error:', e); 
        return null; 
    } 
}
async function fetchAndStoreInventoryItems() { 
    try { 
        const res = await fetch('/api/admin/inventory'); 
        if (!res.ok) throw new Error(res.statusText); 
        dataCaches.inventory = await res.json(); 
        return dataCaches.inventory; 
    } catch (e) { 
        console.error('Fetch Inventory Error:', e); 
        return null; 
    } 
}
async function fetchAndStoreDoctors() { 
    try { const res = await fetch('/api/admin/doctors'); 
        if (!res.ok) throw new Error(res.statusText); 
        dataCaches.doctors = await res.json(); 
        return dataCaches.doctors; 
    } catch (e) { 
        console.error('Fetch Doctors Error:', e); return null; 
    } 
}
// --- Action Handlers (Updated to use pagination) ---
async function toggleAppointmentStatus(id, currentStatus) {
    const statusCycle = { 'Scheduled': 'Completed', 'Completed': 'Cancelled', 'Cancelled': 'Scheduled' };
    const nextStatus = statusCycle[currentStatus] || 'Scheduled';
    if (!confirm(`Change status from ${currentStatus} to ${nextStatus}?`)) return;
    try {
        await fetch(`/api/admin/appointments/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) });
        const data = await fetchAndStoreAppointments();
        displayPaginatedTable('appointments', data, 1);
        alert('Status updated.');
    } catch (error) { console.error('Error toggling status:', error); alert(`Error: ${error.message}`); }
}

async function archiveAppointment(id, isArchived) {
    const action = isArchived ? 'unarchive' : 'archive';
    if (!confirm(`Are you sure you want to ${action} this appointment?`)) return;
    try {
        await fetch(`/api/admin/appointments/${id}/archive`, { method: 'PUT' });
        const data = await fetchAndStoreAppointments();
        displayPaginatedTable('appointments', data, 1);
        updateArchivedButtonText();
        alert(`Appointment ${action}d.`);
    } catch (error) { console.error(`Error ${action}ing:`, error); alert(`Error: ${error.message}`); }
}

async function promoteUserToDoctor(userId, userName) {
    // Ask the admin for confirmation
    if (!confirm(`Are you sure you want to promote "${userName}" to a Doctor? This will create a doctor profile for them.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}/promote`, {
            method: 'POST',
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to promote user.');
        }

        alert(result.message);

        // Refresh both the users and doctors tables to show the change
        loadAllAdminData();

    } catch (error) {
        console.error('Error promoting user:', error);
        alert(`Error: ${error.message}`);
    }
}

async function deleteInventoryItem(id, name) {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
        await fetch(`/api/admin/inventory/${id}`, { method: 'DELETE' });
        
        // This refetches and updates the cache, which is correct.
        const data = await fetchAndStoreInventoryItems(); 
        
        // This redisplays the table, which is also correct.
        displayPaginatedTable('inventory', data, 1);
        
        // --- THIS IS THE FIX ---
        // Update the dashboard stats using the correct cache object.
        updateDashboardStats({ inventory: dataCaches.inventory.length });
        
        alert(`"${name}" deleted.`);
    } catch (error) { 
        console.error('Error deleting item:', error); 
        alert(`Error: ${error.message}`); 
    }
}

async function demoteDoctor(doctorId, doctorName) {
    // A crucial confirmation step for a destructive action
    if (!confirm(`Are you sure you want to remove doctor status for "${doctorName}"? This will delete their doctor profile.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/doctors/${doctorId}/demote`, {
            method: 'DELETE',
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to demote doctor.');
        }

        alert(result.message);

        // Refresh all data to reflect the change in both the users and doctors tables
        await loadAllAdminData();

    } catch (error) {
        console.error('Error demoting doctor:', error);
        alert(`Error: ${error.message}`);
    }
}

// --- MODALS (Corrected to use pagination on success) ---
function openAddAppointmentModal() {
    const modal = document.getElementById('appointment-modal');
    const form = document.getElementById('appointment-form');
    if (!modal || !form) return;
    form.reset();
    form.querySelector('#appointment-id').value = '';
    const modalTitle = document.getElementById('appointment-modal-title');
    if (modalTitle) modalTitle.textContent = 'Add New Appointment';
    modal.style.display = 'flex';
    form.onsubmit = async (e) => {
        e.preventDefault();
        const newData = {
            patientName: form.querySelector('#patient-name').value,
            patientEmail: form.querySelector('#patient-email-modal').value,
            doctorName: form.querySelector('#doctor-name-modal').value,
            specialization: form.querySelector('#specialization-modal').value,
            date: form.querySelector('#appointment-date').value,
            time: form.querySelector('#appointment-time').value,
            reason: form.querySelector('#appointment-reason-modal').value,
            address: form.querySelector('#appointment-address-modal').value,
            age: form.querySelector('#appointment-age-modal').value ? parseInt(form.querySelector('#appointment-age-modal').value) : null,
            phone: form.querySelector('#appointment-phone-modal').value,
            status: form.querySelector('#appointment-status-modal').value,
        };
        // ... (your validation logic is fine) ...

        try {
            const response = await fetch('/api/admin/appointments', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData)
            });
            if (!response.ok) { const d = await response.json(); throw new Error(d.error || `Error ${response.status}`); }
            modal.style.display = 'none';

            // --- THIS IS THE FIX ---
            const appointments = await fetchAndStoreAppointments();
            displayPaginatedTable('appointments', appointments, 1); // Use the new function

            updateDashboardStats({ appointments: allAppointmentsDataCache.length });
            alert('Appointment added!');
        } catch (error) { console.error('Error adding appointment:', error); alert(`Error: ${error.message}`); }
    };
}

function openDoctorModalForPromotion(userId, userName) {
    const modal = document.getElementById('doctor-modal');
    const form = document.getElementById('doctor-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('doctor-modal-title').textContent = 'Promote User to Doctor';
    document.getElementById('doctor-user-id').value = userId; // Store the user ID
    document.getElementById('doctor-profile-id').value = ''; // No doctor profile ID yet
    document.getElementById('doctor-name-modal').value = userName;
    
    modal.style.display = 'flex';

    form.onsubmit = async (e) => {
        e.preventDefault();
        const doctorData = {
            specialization: document.getElementById('doctor-specialization-modal').value,
            schedules: document.getElementById('doctor-schedules-modal').value.split(',').map(s => s.trim()),
            acceptedHMOs: document.getElementById('doctor-hmos-modal').value.split(',').map(s => s.trim()),
            description: document.getElementById('doctor-description-modal').value,
        };

        try {
            // This is the new API route we defined
            const response = await fetch(`/api/admin/users/${userId}/create-doctor-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(doctorData)
            });
            if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Failed to create profile'); }
            
            modal.style.display = 'none';
            alert('User successfully promoted to Doctor!');
            
            // Refresh both users and doctors tables
            loadAllAdminData();

        } catch (error) {
            console.error('Error promoting user:', error);
            alert(`Error: ${error.message}`);
        }
    };
}

function openDoctorModalForEditing(doctor) {
    // This function would be very similar, but it would pre-fill all fields
    // from the `doctor` object and perform a PUT request to `/api/admin/doctors/:id`
    // (This part can be implemented next, but the promotion logic is the key part)
    alert(`Editing for ${doctor.userAccount.fullname} can be implemented here.`);
}

function openAddInventoryItemModal() {
    const modal = document.getElementById('inventory-item-modal');
    const form = document.getElementById('inventory-item-form');
    if (!modal || !form) return;
    form.reset();
    form.querySelector('#inventory-item-id').value = '';
    const modalTitle = document.getElementById('inventory-item-modal-title');
    if(modalTitle) modalTitle.textContent = 'Add New Inventory Item';
    modal.style.display = 'flex';
    form.onsubmit = async (e) => {
        e.preventDefault();
        const newData = {
            itemName: form.querySelector('#inventory-item-name').value,
            quantity: form.querySelector('#inventory-item-quantity').value ? parseInt(form.querySelector('#inventory-item-quantity').value) : 0,
            reorderLevel: form.querySelector('#inventory-item-reorder-level').value ? parseInt(form.querySelector('#inventory-item-reorder-level').value) : 10,
            description: form.querySelector('#inventory-item-description').value,
        };
        try {
            const response = await fetch('/api/admin/inventory', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData)
            });
            if (!response.ok) { const d = await response.json(); throw new Error(d.error || `Error ${response.status}`); }
            modal.style.display = 'none';

            // --- THIS IS THE FIX ---
            const inventory = await fetchAndStoreInventoryItems();
            displayPaginatedTable('inventory', inventory, 1); // Use the new function

            updateDashboardStats({ inventory: dataCaches.inventory.length });
            alert('Item added!');
        } catch (error) { console.error('Error adding item:', error); alert(`Error: ${error.message}`); }
    };
}
// Remember to update the .onsubmit handlers inside these functions to call
// `displayPaginatedTable(type, data, 1)` after a successful add.


// --- SEARCH FUNCTIONALITY (Updated to use pagination) ---

function setupSearchListeners() {
    const configs = [
        { 
            type: 'users', 
            filter: (item, term) => {
                const firstName = (item.firstName || '').toLowerCase();
                const lastName = (item.lastName || '').toLowerCase();
                const email = (item.signupEmail || '').toLowerCase();
                
                const fullName = `${firstName} ${lastName}`;

                return fullName.includes(term) || 
                       firstName.includes(term) ||
                       lastName.includes(term) || 
                       email.includes(term);
            }
        },
        { 
            type: 'appointments', 
            filter: (item, term) => 
                (item.patientName || '').toLowerCase().includes(term) || 
                (item.doctorName || '').toLowerCase().includes(term)
        },
        { 
            type: 'inventory', 
            filter: (item, term) => 
                (item.itemName || '').toLowerCase().includes(term)
        },
        { 
            type: 'doctors', 
             filter: (item, term) => {
                // Let's apply the same logic for doctors for consistency
                const docFirstName = (item.userAccount?.firstName || '').toLowerCase();
                const docLastName = (item.userAccount?.lastName || '').toLowerCase();
                const docFullName = `${docFirstName} ${docLastName}`;
                const specialization = (item.specialization?.name || '').toLowerCase();

                return docFullName.includes(term) || specialization.includes(term);
            }
        }
    ];

    configs.forEach(config => {
        const inputEl = document.getElementById(`${config.type}-search`);
        const btnEl = document.getElementById(`${config.type}-search-btn`);
        
        if (inputEl && btnEl) {
            const search = () => {
                const searchTerm = inputEl.value.toLowerCase().trim();
                // This is the crucial change. We access our object directly.
                const dataCache = dataCaches[config.type]; 
                
                if (!dataCache) {
                    console.error(`Search data cache not found for type: ${config.type}`);
                    return;
                }

                const filteredData = searchTerm 
                    ? dataCache.filter(item => config.filter(item, searchTerm))
                    : dataCache;
                
                displayPaginatedTable(config.type, filteredData, 1);
            };

            btnEl.addEventListener('click', search);
            // We'll keep the live-search functionality
            inputEl.addEventListener('input', search);
        }
    });
}


// --- UI HELPERS & UTILITIES ---
function initializeModalEventListeners() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    });
    document.querySelectorAll('.close-modal, .modal .cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => { btn.closest('.modal').style.display = 'none'; });
    });
}

// --- DASHBOARD STATS ---
function updateDashboardStats(data = {}) {
    if (data.users !== undefined) {
        const usersCountEl = document.getElementById('dashboard-total-users');
        if (usersCountEl) usersCountEl.textContent = data.users;
    }
    if (data.appointments !== undefined) {
        const apptsCountEl = document.getElementById('dashboard-appointments-count');
        if (apptsCountEl) apptsCountEl.textContent = data.appointments;
    }
    if (data.inventory !== undefined) {
        const inventoryItemsEl = document.getElementById('dashboard-inventory-items');
        if (inventoryItemsEl) inventoryItemsEl.textContent = data.inventory;
    }
}

function updateArchivedButtonText() {
    const btn = document.getElementById('toggle-archived-view-btn');
    if (btn) {
        btn.innerHTML = showingArchivedAppointments ? '<i class="fas fa-calendar-check"></i> View Active' : '<i class="fas fa-archive"></i> View Archived';
        btn.title = showingArchivedAppointments ? "Show active appointments" : "Show archived appointments";
    }
}

function updateAppointmentsViewIndicator() {
    const indicator = document.getElementById('appointments-view-indicator');
    if (indicator) indicator.textContent = showingArchivedAppointments ? '(Archived)' : '(Active)';
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }