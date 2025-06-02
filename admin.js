document.addEventListener('DOMContentLoaded', function() {
    // Initial app setup (session check already in admin.html inline script)
    // Now, directly load data since session check is done.
    loadAllAdminData();
    initializeAdditionalUIEventListeners(); // For modals, search, etc. that are not in inline script
});


function initializeAdditionalUIEventListeners() {
    // Modal handling and search listeners
    initializeModalEventListeners();
    setupSearchListeners(); // Call the consolidated search setup

    // REMOVED: Event listener for 'add-new-appointment-btn'

    // Specific "Add New Inventory Item" Button Listener (if the button exists in admin.html)
    const addNewInventoryItemBtn = document.getElementById('add-new-inventory-item-btn');
    if (addNewInventoryItemBtn) {
        addNewInventoryItemBtn.addEventListener('click', () => openAddInventoryItemModal());
    }
     // Event listener for the toggle archived appointments button
    const toggleArchivedBtn = document.getElementById('toggle-archived-view-btn');
    if (toggleArchivedBtn) {
        toggleArchivedBtn.addEventListener('click', () => {
            showingArchivedAppointments = !showingArchivedAppointments; // Toggle the state
            fetchAndStoreAppointments().then(appointments => { // Re-fetch and display
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
            fetchAndStoreAppointments(),
            fetchAndStoreInventoryItems()
        ]);

        if (users) displayUsersTable(users);
        if (appointments) displayAppointmentsTable(appointments);
        if (inventoryItems) displayInventoryTable(inventoryItems);

        updateDashboardStats({
            users: users ? users.length : 0,
            appointments: appointments ? appointments.length : 0,
            inventory: inventoryItems ? inventoryItems.length : 0
        });
        updateArchivedButtonText(); // Initialize button text for archived view
        updateAppointmentsViewIndicator(); // Initialize view indicator for appointments

    } catch (error) {
        console.error("Error loading admin data:", error);
    }
}

// --- USERS ---
let allUsersDataCache = [];

async function fetchAndStoreUsers() {
    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
        }
        allUsersDataCache = await response.json();
        return allUsersDataCache;
    } catch (error) {
        console.error('Error fetching users:', error);
        const tableBody = document.querySelector('#users-table tbody');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error loading users.</td></tr>';
        return null;
    }
}

function displayUsersTable(users) {
    const tableBody = document.querySelector('#users-table tbody');
    if (!tableBody) {
        console.error("User table body not found!");
        return;
    }
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
            throw new Error(`Failed to fetch appointments: ${response.status} ${response.statusText}`);
        }
        allAppointmentsDataCache = await response.json();
        return allAppointmentsDataCache;
    } catch (error) {
        console.error('Error fetching appointments:', error);
        const tableBody = document.querySelector('#appointments-table tbody');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error loading appointments.</td></tr>';
        return null;
    }
}

function displayAppointmentsTable(appointments) {
    const tableBody = document.querySelector('#appointments-table tbody');
    if (!tableBody) {
        console.error("Appointments table body not found!");
        return;
    }
    tableBody.innerHTML = '';

    const noDataMessage = showingArchivedAppointments ? 'No archived appointments found.' : 'No active appointments found.';
    if (!appointments || appointments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">${noDataMessage}</td></tr>`;
        return;
    }

    appointments.forEach(appt => {
        const row = tableBody.insertRow();
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
        actionsCell.innerHTML = `
            <button class="action-btn toggle-status-btn" data-id="${appt._id}" data-current-status="${statusText}" title="Toggle Status"><i class="fas fa-exchange-alt"></i></button>
            <button class="action-btn archive-appointment-btn" data-id="${appt._id}" title="${archiveButtonText} Appointment"><i class="fas ${archiveButtonIcon}"></i></button>
        `;

        actionsCell.querySelector('.toggle-status-btn').addEventListener('click', (e) => toggleAppointmentStatus(e.currentTarget.dataset.id, e.currentTarget.dataset.currentStatus));
        actionsCell.querySelector('.archive-appointment-btn').addEventListener('click', (e) => archiveAppointment(e.currentTarget.dataset.id, appt.isArchived));
    });
}

async function toggleAppointmentStatus(appointmentId, currentStatus) {
    let nextStatus;
    if (currentStatus === 'Scheduled') nextStatus = 'Completed';
    else if (currentStatus === 'Completed') nextStatus = 'Cancelled';
    else if (currentStatus === 'Cancelled') nextStatus = 'Scheduled';
    else nextStatus = 'Scheduled';

    if (!confirm(`Change status for appointment ID ${appointmentId.slice(-6)} from ${currentStatus} to ${nextStatus}?`)) return;

    try {
        const response = await fetch(`/api/admin/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to update status: ${response.statusText}`);
        }
        await loadAllAdminData();
        alert(`Appointment status updated to ${nextStatus}.`);
    } catch (error) {
        console.error('Error toggling appointment status:', error);
        alert(`Error: ${error.message}`);
    }
}

async function archiveAppointment(appointmentId, isCurrentlyArchived) {
    const action = isCurrentlyArchived ? "unarchive" : "archive";
    if (!confirm(`Are you sure you want to ${action} appointment ID ${appointmentId.slice(-6)}?`)) return;

    try {
        const response = await fetch(`/api/admin/appointments/${appointmentId}/archive`, {
            method: 'PUT'
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to ${action} appointment: ${response.statusText}`);
        }
        await loadAllAdminData();
        alert(`Appointment has been ${action}d.`);
    } catch (error) {
        console.error(`Error ${action}ing appointment:`, error);
        alert(`Error: ${error.message}`);
    }
}



// --- INVENTORY ---
let allInventoryDataCache = [];

async function fetchAndStoreInventoryItems() {
    try {
        const response = await fetch('/api/admin/inventory');
        if (!response.ok) {
            throw new Error(`Failed to fetch inventory: ${response.status} ${response.statusText}`);
        }
        allInventoryDataCache = await response.json();
        return allInventoryDataCache;
    } catch (error) {
        console.error('Error fetching inventory:', error);
        const tableBody = document.querySelector('#inventory-table tbody');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error loading inventory.</td></tr>';
        return null;
    }
}

function displayInventoryTable(items) {
    const tableBody = document.querySelector('#inventory-table tbody');
    if (!tableBody) {
        console.error("Inventory table body not found!");
        return;
    }
    tableBody.innerHTML = '';

    if (!items || items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No inventory items found.</td></tr>';
        return;
    }

    items.forEach(item => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.itemName || 'N/A';
        row.insertCell().textContent = item.quantity !== undefined ? item.quantity : 'N/A';
        const statusCell = row.insertCell();
        const statusBadge = document.createElement('span');
        const statusText = item.status || 'N/A';
        statusBadge.classList.add('status-badge', `status-${statusText.toLowerCase().replace(/\s+/g, '-')}`);
        statusBadge.textContent = statusText;
        statusCell.appendChild(statusBadge);
        row.insertCell().textContent = item.reorderLevel !== undefined ? item.reorderLevel : 'N/A';
        row.insertCell().textContent = item.description || 'N/A';
        row.insertCell().textContent = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A');
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button class="action-btn delete-inventory-item-btn" data-id="${item._id}" title="Delete Item"><i class="fas fa-trash"></i></button>
        `;
        actionsCell.querySelector('.delete-inventory-item-btn').addEventListener('click', (e) => deleteInventoryItem(e.currentTarget.dataset.id, item.itemName));
    });
}

async function deleteInventoryItem(itemId, itemName) {
    if (!confirm(`Are you sure you want to delete inventory item "${itemName || 'this item'}" (ID: ${itemId.slice(-6)})?`)) return;
    try {
        const response = await fetch(`/api/admin/inventory/${itemId}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || `Failed to delete: ${response.statusText}`);
        }
        await loadAllAdminData();
        alert(`Inventory item "${itemName || 'ID: ' + itemId.slice(-6)}" deleted.`);
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        alert(`Error: ${error.message}`);
    }
}

function openAddInventoryItemModal() {
    const modal = document.getElementById('inventory-item-modal');
    const form = document.getElementById('inventory-item-form');
    if (!modal || !form) {
        console.error("Inventory modal or form for ADD not found.");
        return;
    }
    form.reset();
    form.querySelector('#inventory-item-id').value = '';
    const modalTitle = document.getElementById('inventory-item-modal-title');
    if (modalTitle) modalTitle.textContent = 'Add New Inventory Item';
    modal.style.display = 'flex';

    form.onsubmit = async (e) => {
        e.preventDefault();
        const newData = {
            itemName: form.querySelector('#inventory-item-name').value,
            quantity: form.querySelector('#inventory-item-quantity').value ? parseInt(form.querySelector('#inventory-item-quantity').value) : 0,
            reorderLevel: form.querySelector('#inventory-item-reorder-level').value ? parseInt(form.querySelector('#inventory-item-reorder-level').value) : 10,
            description: form.querySelector('#inventory-item-description').value,
        };
        if (!newData.itemName || newData.quantity === undefined || newData.quantity < 0) {
            alert("Item Name and a valid Quantity (0 or more) are required.");
            return;
        }
        try {
            const response = await fetch('/api/admin/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Failed to add item: ${response.statusText}`);
            }
            modal.style.display = 'none';
            await loadAllAdminData();
            alert('Inventory item added!');
        } catch (error) {
            console.error('Error adding inventory item:', error);
            alert(`Error: ${error.message}`);
        }
    };
}


// --- DASHBOARD STATS ---
function updateDashboardStats(data = {}) {
    if (data.users !== undefined) {
        document.getElementById('dashboard-total-users').textContent = data.users;
    }
    if (data.appointments !== undefined) {
        document.getElementById('dashboard-appointments-count').textContent = data.appointments;
    }
    if (data.inventory !== undefined) {
        document.getElementById('dashboard-inventory-items').textContent = data.inventory;
    }
    document.getElementById('dashboard-payments-today').textContent = '₱0.00'; // Placeholder
}

// --- UI HELPERS FOR ARCHIVED VIEW ---
function updateArchivedButtonText() {
    const toggleArchivedBtn = document.getElementById('toggle-archived-view-btn');
    if (toggleArchivedBtn) {
        if (showingArchivedAppointments) {
            toggleArchivedBtn.innerHTML = '<i class="fas fa-calendar-check"></i> View Active';
            toggleArchivedBtn.title = "Show active (non-archived) appointments";
        } else {
            toggleArchivedBtn.innerHTML = '<i class="fas fa-archive"></i> View Archived';
            toggleArchivedBtn.title = "Show archived appointments";
        }
    }
}

function updateAppointmentsViewIndicator() {
    const indicator = document.getElementById('appointments-view-indicator');
    if (indicator) {
        indicator.textContent = showingArchivedAppointments ? '(Archived)' : '(Active)';
    }
}

// --- SEARCH FUNCTIONALITY (Consolidated) ---
function setupSearchListeners() {
    const searchConfigurations = [
        {
            btnId: 'users-search-btn',
            inputId: 'users-search',
            dataCache: () => allUsersDataCache,
            displayFn: displayUsersTable,
            filterLogic: (item, term) => (item.fullname && item.fullname.toLowerCase().includes(term)) ||
                                         (item.signupEmail && item.signupEmail.toLowerCase().includes(term))
        },
        {
            btnId: 'appointments-search-btn',
            inputId: 'appointments-search',
            dataCache: () => allAppointmentsDataCache,
            displayFn: displayAppointmentsTable,
            filterLogic: (item, term) => (item.patientName && item.patientName.toLowerCase().includes(term)) ||
                                         (item.patientEmail && item.patientEmail.toLowerCase().includes(term)) ||
                                         (item.doctorName && item.doctorName.toLowerCase().includes(term))
        },
        {
            btnId: 'inventory-search-btn',
            inputId: 'inventory-search',
            dataCache: () => allInventoryDataCache,
            displayFn: displayInventoryTable,
            filterLogic: (item, term) => (item.itemName && item.itemName.toLowerCase().includes(term)) ||
                                         (item.description && item.description.toLowerCase().includes(term))
        }
    ];

    searchConfigurations.forEach(config => {
        const searchBtn = document.getElementById(config.btnId);
        const searchInput = document.getElementById(config.inputId);

        if (searchBtn && searchInput) {
            const performSearch = () => {
                const searchTerm = searchInput.value.toLowerCase().trim();
                const currentDataCache = config.dataCache();
                if (!searchTerm) {
                    config.displayFn(currentDataCache);
                    return;
                }
                const filteredData = currentDataCache.filter(item => config.filterLogic(item, searchTerm));
                config.displayFn(filteredData);
            };
            searchBtn.addEventListener('click', performSearch);
            searchInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    performSearch();
                }
            });
        } else {
            console.warn(`Search elements not found for input: #${config.inputId} or button: #${config.btnId}`);
        }
    });
}


// --- MODAL EVENT LISTENERS (General closing) ---
function initializeModalEventListeners() {
    const modals = document.querySelectorAll('.modal');
    const closeModalButtons = document.querySelectorAll('.close-modal');

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });
    modals.forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) modal.style.display = 'none';
        });
    });
    document.querySelectorAll('.modal .cancel-btn').forEach(cancelBtn => {
        cancelBtn.addEventListener('click', () => {
            cancelBtn.closest('.modal').style.display = 'none';
        });
    });
}