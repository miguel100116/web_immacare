document.addEventListener('DOMContentLoaded', function() {
    // Initial app setup: Session check is handled by inline script in admin.html.
    // Data loading and additional UI listeners are called after session check passes.
    // The inline script in admin.html calls loadAdminUserInfo which then should call these if successful.
    // For robustness, we can also call them here, guarded by a check if needed,
    // or ensure the inline script calls them after successful /getUser.

    // Assuming the inline script has verified the admin and the page hasn't redirected:
    loadAllAdminData();
    initializeAdditionalUIEventListeners();
});


function initializeAdditionalUIEventListeners() {
    initializeModalEventListeners();
    setupSearchListeners();

    const addNewAppointmentBtn = document.getElementById('add-new-appointment-btn');
    if (addNewAppointmentBtn) {
        addNewAppointmentBtn.addEventListener('click', () => openAddAppointmentModal());
    }

    const addNewInventoryItemBtn = document.getElementById('add-new-inventory-item-btn');
    if (addNewInventoryItemBtn) {
        addNewInventoryItemBtn.addEventListener('click', () => openAddInventoryItemModal());
    }

    const toggleArchivedBtn = document.getElementById('toggle-archived-view-btn');
    if (toggleArchivedBtn) {
        toggleArchivedBtn.addEventListener('click', () => {
            showingArchivedAppointments = !showingArchivedAppointments;
            // Refetch and display appointments based on the new state
            fetchAndStoreAppointments().then(appointments => {
                if (appointments) displayAppointmentsTable(appointments);
                updateArchivedButtonText();
                updateAppointmentsViewIndicator();
            });
        });
    }
}

async function loadAllAdminData() {
    try {
        const [users, appointments, inventoryItems] = await Promise.all([
            fetchAndStoreUsers(),
            fetchAndStoreAppointments(), // Fetches active by default
            fetchAndStoreInventoryItems()
        ]);

        if (users) displayUsersTable(users);
        if (appointments) displayAppointmentsTable(appointments);
        if (inventoryItems) displayInventoryTable(inventoryItems);

        updateDashboardStats({
            users: users ? users.length : 0,
            appointments: appointments ? appointments.length : 0, // Will show count of active initially
            inventory: inventoryItems ? inventoryItems.length : 0
        });
        updateArchivedButtonText(); // Set initial button text
        updateAppointmentsViewIndicator(); // Set initial view indicator

    } catch (error) {
        console.error("Error loading admin data:", error);
        const dashboardSection = document.getElementById('dashboard');
        if(dashboardSection) {
            let errorDiv = dashboardSection.querySelector('.admin-data-error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'admin-data-error'; // For potential styling
                errorDiv.style.color = "red";
                errorDiv.style.padding = "20px";
                errorDiv.style.border = "1px solid red";
                errorDiv.style.marginBottom = "15px";
                dashboardSection.prepend(errorDiv);
            }
            errorDiv.textContent = "Error loading initial dashboard data. Please check console and try again.";
        }
    }
}

// --- USERS ---
let allUsersDataCache = [];
async function fetchAndStoreUsers() {
    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
            throw new Error(`Users Fetch: ${response.status} ${response.statusText}`);
        }
        allUsersDataCache = await response.json();
        return allUsersDataCache;
    } catch (error) {
        console.error('Error fetching users:', error);
        const tableBody = document.querySelector('#users-table tbody');
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
        return null;
    }
}

function displayUsersTable(users) {
    const tableBody = document.querySelector('#users-table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
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
        row.insertCell().innerHTML = user.isVerified ? '<span class="status-badge status-yes">Yes</span>' : '<span class="status-badge status-no">No</span>';
        row.insertCell().innerHTML = user.isAdmin ? '<span class="status-badge status-admin">Yes</span>' : '<span class="status-badge status-user">No</span>';
    });
}

// --- APPOINTMENTS ---
let allAppointmentsDataCache = [];
let showingArchivedAppointments = false;

async function fetchAndStoreAppointments() {
    try {
        const apiUrl = showingArchivedAppointments ? '/api/admin/appointments?archived=true' : '/api/admin/appointments';
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Appointments Fetch: ${response.status} ${response.statusText}`);
        }
        allAppointmentsDataCache = await response.json();
        return allAppointmentsDataCache;
    } catch (error) {
        console.error('Error fetching appointments:', error);
        const tableBody = document.querySelector('#appointments-table tbody');
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
        return null;
    }
}

function displayAppointmentsTable(appointments) {
    const tableBody = document.querySelector('#appointments-table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const noDataMessage = showingArchivedAppointments ? 'No archived appointments found.' : 'No active appointments found.';
    if (!appointments || appointments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">${noDataMessage}</td></tr>`;
        return;
    }
    appointments.forEach(appt => {
        const row = tableBody.insertRow();
        if (appt.isArchived) row.classList.add('archived-row');

        row.insertCell().textContent = appt.patientName || 'N/A';
        row.insertCell().textContent = appt.patientEmail || 'N/A';
        row.insertCell().textContent = appt.doctorName || 'N/A';
        row.insertCell().textContent = appt.date ? new Date(appt.date).toLocaleDateString() : 'N/A';
        row.insertCell().textContent = appt.time || 'N/A';

        const statusCell = row.insertCell();
        const statusBadge = document.createElement('span');
        const statusText = appt.status || 'Scheduled';
        statusBadge.classList.add('status-badge', `status-${statusText.toLowerCase()}`);
        statusBadge.textContent = statusText;
        statusCell.appendChild(statusBadge);

        const actionsCell = row.insertCell();
        const archiveButtonText = appt.isArchived ? 'Unarchive' : 'Archive';
        const archiveButtonIcon = appt.isArchived ? 'fa-box-open' : 'fa-archive';
        const toggleStatusButton = `<button class="action-btn toggle-status-btn" data-id="${appt._id}" data-current-status="${statusText}" title="Toggle Status" ${appt.isArchived ? 'disabled' : ''}><i class="fas fa-exchange-alt"></i></button>`;
        actionsCell.innerHTML = `
            ${!appt.isArchived ? toggleStatusButton : '<button class="action-btn" disabled title="Status cannot be changed for archived items"><i class="fas fa-exchange-alt"></i></button>'}
            <button class="action-btn archive-appointment-btn" data-id="${appt._id}" title="${archiveButtonText} Appointment"><i class="fas ${archiveButtonIcon}"></i></button>
        `;

        const toggleBtnInstance = actionsCell.querySelector('.toggle-status-btn');
        if (toggleBtnInstance && !appt.isArchived) {
            toggleBtnInstance.addEventListener('click', (e) => toggleAppointmentStatus(e.currentTarget.dataset.id, e.currentTarget.dataset.currentStatus));
        }
        actionsCell.querySelector('.archive-appointment-btn').addEventListener('click', (e) => archiveAppointment(e.currentTarget.dataset.id, appt.isArchived));
    });
}

async function toggleAppointmentStatus(appointmentId, currentStatus) {
    let nextStatus;
    if (currentStatus === 'Scheduled') nextStatus = 'Completed';
    else if (currentStatus === 'Completed') nextStatus = 'Cancelled';
    else if (currentStatus === 'Cancelled') nextStatus = 'Scheduled';
    else nextStatus = 'Scheduled';
    if (!confirm(`Change appointment status from ${currentStatus} to ${nextStatus}?`)) return;
    try {
        const response = await fetch(`/api/admin/appointments/${appointmentId}/status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus })
        });
        if (!response.ok) { const d = await response.json(); throw new Error(d.error || `E${response.status}`); }
        await fetchAndStoreAppointments().then(appts => displayAppointmentsTable(appts)); // Re-fetch and display only appointments
        alert(`Status updated to ${nextStatus}.`);
    } catch (error) { console.error('Error toggling status:', error); alert(`Error: ${error.message}`); }
}

async function archiveAppointment(appointmentId, isCurrentlyArchived) {
    const action = isCurrentlyArchived ? "unarchive" : "archive";
    if (!confirm(`Are you sure you want to ${action} this appointment?`)) return;
    try {
        const response = await fetch(`/api/admin/appointments/${appointmentId}/archive`, { method: 'PUT' });
        if (!response.ok) { const d = await response.json(); throw new Error(d.error || `E${response.status}`); }
        await fetchAndStoreAppointments().then(appts => displayAppointmentsTable(appts)); // Re-fetch and display only appointments
        updateArchivedButtonText(); // Update button as it might change what's shown
        alert(`Appointment ${action}d.`);
    } catch (error) { console.error(`Error ${action}ing:`, error); alert(`Error: ${error.message}`); }
}

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
        const newData = { /* ... (collect data as before) ... */
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
        Object.keys(newData).forEach(key => (newData[key] === null || newData[key] === undefined || newData[key] === '') && delete newData[key]);

        if (!newData.patientName || !newData.date || !newData.time || !newData.doctorName || !newData.status) {
            alert("Patient Name, Doctor, Date, Time, and Status are required."); return;
        }
        if (newData.age && (isNaN(newData.age) || newData.age <0) ) { alert("Valid age required."); return; }

        try {
            const response = await fetch('/api/admin/appointments', { // Requires POST /api/admin/appointments in server.js
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData)
            });
            if (!response.ok) { const d = await response.json(); throw new Error(d.error || `E${response.status}`); }
            modal.style.display = 'none';
            await fetchAndStoreAppointments().then(appts => displayAppointmentsTable(appts));
            updateDashboardStats({ appointments: allAppointmentsDataCache.length }); // Update count
            alert('Appointment added!');
        } catch (error) { console.error('Error adding appointment:', error); alert(`Error: ${error.message}`); }
    };
}

// --- INVENTORY ---
let allInventoryDataCache = [];
async function fetchAndStoreInventoryItems() {
    try {
        const response = await fetch('/api/admin/inventory');
        if (!response.ok) { throw new Error(`Inventory Fetch: ${response.status} ${response.statusText}`); }
        allInventoryDataCache = await response.json();
        return allInventoryDataCache;
    } catch (error) {
        console.error('Error fetching inventory:', error);
        const tb = document.querySelector('#inventory-table tbody');
        if (tb) tb.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">Error: ${error.message}</td></tr>`;
        return null;
    }
}
function displayInventoryTable(items) {
    const tb = document.querySelector('#inventory-table tbody');
    if (!tb) return;
    tb.innerHTML = '';
    if (!items || items.length === 0) {
        tb.innerHTML = '<tr><td colspan="7" style="text-align:center;">No inventory items.</td></tr>'; return;
    }
    items.forEach(item => {
        const r = tb.insertRow();
        r.insertCell().textContent = item.itemName || 'N/A';
        r.insertCell().textContent = item.quantity !== undefined ? item.quantity : 'N/A';
        const sC = r.insertCell(); const sB = document.createElement('span');
        const sT = item.status || 'N/A';
        sB.className = `status-badge status-${sT.toLowerCase().replace(/\s+/g, '-')}`;
        sB.textContent = sT; sC.appendChild(sB);
        r.insertCell().textContent = item.reorderLevel !== undefined ? item.reorderLevel : 'N/A';
        r.insertCell().textContent = item.description || 'N/A';
        r.insertCell().textContent = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A');
        const aC = r.insertCell();
        aC.innerHTML = `<button class="action-btn delete-inventory-item-btn" data-id="${item._id}" title="Delete"><i class="fas fa-trash"></i></button>`;
        aC.querySelector('.delete-inventory-item-btn').addEventListener('click', (e) => deleteInventoryItem(e.currentTarget.dataset.id, item.itemName));
    });
}
async function deleteInventoryItem(itemId, itemName) {
    if (!confirm(`Delete "${itemName || 'item'}" (ID: ${itemId.slice(-6)})?`)) return;
    try {
        const response = await fetch(`/api/admin/inventory/${itemId}`, { method: 'DELETE' });
        if (!response.ok) { const d = await response.json(); throw new Error(d.error || `E${response.status}`); }
        await fetchAndStoreInventoryItems().then(items => displayInventoryTable(items));
        updateDashboardStats({ inventory: allInventoryDataCache.length });
        alert(`"${itemName || 'Item'}" deleted.`);
    } catch (error) { console.error('Error deleting item:', error); alert(`Error: ${error.message}`); }
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
        const newData = { /* ... (collect data as before) ... */
            itemName: form.querySelector('#inventory-item-name').value,
            quantity: form.querySelector('#inventory-item-quantity').value ? parseInt(form.querySelector('#inventory-item-quantity').value) : 0,
            reorderLevel: form.querySelector('#inventory-item-reorder-level').value ? parseInt(form.querySelector('#inventory-item-reorder-level').value) : 10,
            description: form.querySelector('#inventory-item-description').value,
        };
        if (!newData.itemName || newData.quantity === undefined || newData.quantity < 0) {
            alert("Name and valid Quantity (0+) required."); return;
        }
        try {
            const response = await fetch('/api/admin/inventory', { // Requires POST /api/admin/inventory
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData)
            });
            if (!response.ok) { const d = await response.json(); throw new Error(d.error || `E${response.status}`); }
            modal.style.display = 'none';
            await fetchAndStoreInventoryItems().then(items => displayInventoryTable(items));
            updateDashboardStats({ inventory: allInventoryDataCache.length });
            alert('Item added!');
        } catch (error) { console.error('Error adding item:', error); alert(`Error: ${error.message}`); }
    };
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
// --- UI HELPERS FOR ARCHIVED APPOINTMENTS VIEW ---
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

// --- SEARCH FUNCTIONALITY ---
function setupSearchListeners() {
    const configs = [
        { btn: 'users-search-btn', input: 'users-search', cache: () => allUsersDataCache, display: displayUsersTable, filter: (i, t) => (i.fullname&&i.fullname.toLowerCase().includes(t))||(i.signupEmail&&i.signupEmail.toLowerCase().includes(t)) },
        { btn: 'appointments-search-btn', input: 'appointments-search', cache: () => allAppointmentsDataCache, display: displayAppointmentsTable, filter: (i, t) => (i.patientName&&i.patientName.toLowerCase().includes(t))||(i.patientEmail&&i.patientEmail.toLowerCase().includes(t))||(i.doctorName&&i.doctorName.toLowerCase().includes(t)) },
        { btn: 'inventory-search-btn', input: 'inventory-search', cache: () => allInventoryDataCache, display: displayInventoryTable, filter: (i, t) => (i.itemName&&i.itemName.toLowerCase().includes(t))||(i.description&&i.description.toLowerCase().includes(t)) }
    ];
    configs.forEach(c => {
        const btnEl = document.getElementById(c.btn); const inputEl = document.getElementById(c.input);
        if (btnEl && inputEl) {
            const search = () => {
                const term = inputEl.value.toLowerCase().trim();
                c.display(term ? c.cache().filter(i => c.filter(i, term)) : c.cache());
            };
            btnEl.addEventListener('click', search);
            inputEl.addEventListener('keyup', e => { if (e.key === 'Enter') search(); });
        } else { console.warn(`Search elements missing for ${c.input}`); }
    });
}

// --- MODAL EVENT LISTENERS ---
function initializeModalEventListeners() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    });
    document.querySelectorAll('.close-modal, .modal .cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => { btn.closest('.modal').style.display = 'none'; });
    });
}