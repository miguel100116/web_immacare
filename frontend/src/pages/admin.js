// frontend/src/pages/admin.js

// =====================================================================
// --- GLOBAL STATE & CONSTANTS ---
// =====================================================================
const dataCaches = {
    users: [],
    appointments: [],
    inventory: [],
    doctors: [],
    staff: [],
    auditLog: [],
    financials: []
};

let showingArchivedInventory = false;
let showingArchivedAppointments = false;
const ITEMS_PER_PAGE = 10;
let currentFinancialsFilter = '';

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
    document.getElementById('add-new-doctor-btn')?.addEventListener('click', () => openAddDoctorModal());
    document.getElementById('add-new-staff-btn')?.addEventListener('click', () => openAddStaffModal());
    document.getElementById('add-new-inventory-item-btn')?.addEventListener('click', () => openAddInventoryItemModal());
    document.getElementById('toggle-archived-view-btn')?.addEventListener('click', async () => {
        showingArchivedAppointments = !showingArchivedAppointments;
        const appointments = await fetchAndStoreAppointments();
        if (appointments) displayPaginatedTable('appointments', appointments, 1);
        updateArchivedButtonText();
        updateAppointmentsViewIndicator();
    });
    document.getElementById('toggle-archived-inventory-btn')?.addEventListener('click', async () => {
        showingArchivedInventory = !showingArchivedInventory;
        const items = await fetchAndStoreInventoryItems();
        if (items) displayPaginatedTable('inventory', items, 1);
        updateArchivedInventoryButtonText();
    });
    // --- Financials UI Listeners (from staff.js) ---
    document.getElementById('add-financial-record-btn')?.addEventListener('click', openFinancialRecordModal);
    document.getElementById('generate-report-btn')?.addEventListener('click', handleGenerateReport);
    
    const financialsMonthFilter = document.getElementById('financials-month-filter');
    if (financialsMonthFilter) {
        flatpickr(financialsMonthFilter, {
            plugins: [
                new monthSelectPlugin({
                  shorthand: true, 
                  dateFormat: "Y-m",
                  altFormat: "F Y",
                })
            ],
            onChange: function(selectedDates, dateStr, instance) {
                currentFinancialsFilter = dateStr;
                loadFinancialRecordsAdmin(dateStr); 
            },
            onReady: function(selectedDates, dateStr, instance) {
                if (!instance.input.value) {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = (now.getMonth() + 1).toString().padStart(2, '0');
                    const defaultMonth = `${year}-${month}`;
                    instance.setDate(defaultMonth);
                    currentFinancialsFilter = defaultMonth;
                    loadFinancialRecordsAdmin(defaultMonth); 
                }
            }
        });
    }

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

    window.customElements.whenDefined('password-modal').then(() => {
        // Now it's safe to find the elements and add the listener.
        const openPasswordModalBtn = document.getElementById('open-password-modal-btn');
        const passwordModalComponent = document.querySelector('password-modal');
        
        if (openPasswordModalBtn && passwordModalComponent) {
            openPasswordModalBtn.addEventListener('click', () => {
                passwordModalComponent.show();
            });
        }
    });
}

async function loadAllAdminData() {
    try {
        const [users, appointments, inventoryItems, doctors, staff, auditLogs] = await Promise.all([
            fetchAndStoreUsers(),
            fetchAndStoreAppointments(),
            fetchAndStoreInventoryItems(),
            fetchAndStoreDoctors(),
            fetchAndStoreStaff(),
            fetchAndStoreAuditLogs(),
        ]);

        if (users) displayPaginatedTable('users', users, 1);
        if (appointments) displayPaginatedTable('appointments', appointments, 1);
        if (inventoryItems) displayPaginatedTable('inventory', inventoryItems, 1);
        if (doctors) displayPaginatedTable('doctors', doctors, 1);
        if (staff) displayPaginatedTable('staff', staff, 1);
        if (auditLogs) {
            displayPaginatedTable('auditLog', auditLogs, 1);
        } else {
            console.error("'auditLogs' data is null or undefined after fetching.");
        }
        // Financials are loaded on-demand by the month picker, so no initial load here.

        updateDashboardStats({
            users: users?.length || 0,
            appointments: appointments?.length || 0,
            inventory: inventoryItems?.length || 0
        });
        updateArchivedButtonText();
        updateAppointmentsViewIndicator();
    } catch (error) {
        console.error("Error loading admin data:", error);
        // Optionally, display a global error message on the dashboard
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
function renderUsersRow(tableBody, user) {
    const row = tableBody.insertRow();
    row.insertCell().textContent = user.firstName || 'N/A';
    row.insertCell().textContent = user.lastName || 'N/A';
    row.insertCell().textContent = user.signupEmail || 'N/A';
    row.insertCell().textContent = user.PhoneNumber || 'N/A';
    row.insertCell().textContent = user.Age || 'N/A';
    row.insertCell().textContent = user.Sex || 'N/A';
    row.insertCell().innerHTML = `<span class="status-badge status-${user.isVerified ? 'yes' : 'no'}">${user.isVerified ? 'Yes' : 'No'}</span>`;
    
    const roleCell = row.insertCell();
    if (user.isAdmin) {
        roleCell.innerHTML = `<span class="status-badge status-admin">Admin</span>`;
    } else if (user.isDoctor) {
        roleCell.innerHTML = `<span class="status-badge status-doctor">Doctor</span>`;
    } else if (user.isStaff) {
        roleCell.innerHTML = `<span class="status-badge status-staff-yes">Staff</span>`;
    } else {
        roleCell.innerHTML = `<span class="status-badge status-user">User</span>`;
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
    let badgeClass = '';
    switch (statusText) {
        case 'Scheduled':
            badgeClass = 'status-scheduled';
            break;
        case 'Completed':
            badgeClass = 'status-completed';
            break;
        case 'Cancelled':
            badgeClass = 'status-cancelled';
            break;
        case 'Rescheduled':
            badgeClass = 'status-rescheduled'; // This handles the new status
            break;
        default:
            badgeClass = 'status-other'; // A fallback for any unexpected status
    }
    statusCell.innerHTML = `<span class="status-badge ${badgeClass}">${statusText}</span>`;

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

    const actionsCell = row.insertCell();
    actionsCell.innerHTML = `<span class="status-badge status-doctor">Doctor</span>`;
}

function renderStaffRow(tableBody, staffMember) {
    const row = tableBody.insertRow();
    row.insertCell().textContent = staffMember.firstName || 'N/A';
    row.insertCell().textContent = staffMember.lastName || 'N/A';
    row.insertCell().textContent = staffMember.signupEmail || 'N/A';
    row.insertCell().textContent = staffMember.PhoneNumber || 'N/A';
    
    const actionsCell = row.insertCell();
    actionsCell.innerHTML = `<span class="status-badge status-staff-yes">Staff</span>`;
}

function renderInventoryRow(tableBody, item) {
    const row = tableBody.insertRow();
    // Add a class to faded out archived rows
    if (item.isArchived) row.classList.add('archived-row');

    row.insertCell().textContent = item.itemName || 'N/A';
    row.insertCell().textContent = item.quantity;
    const statusText = item.status || 'N/A';
    row.insertCell().innerHTML = `<span class="status-badge status-${statusText.toLowerCase().replace(/\s+/g, '-')}">${statusText}</span>`;
    row.insertCell().textContent = item.reorderLevel;
    row.insertCell().textContent = item.description || 'N/A';
    row.insertCell().textContent = new Date(item.updatedAt || item.createdAt).toLocaleDateString();
    
    const actionsCell = row.insertCell();
    const archiveButtonIcon = item.isArchived ? 'fa-box-open' : 'fa-archive';
    const archiveButtonTitle = item.isArchived ? 'Unarchive' : 'Archive';
    
    actionsCell.innerHTML = `<button class="action-btn archive-btn" data-id="${item._id}" title="${archiveButtonTitle}"><i class="fas ${archiveButtonIcon}"></i></button>`;
    
    // Call the new archive function
    actionsCell.querySelector('.archive-btn').addEventListener('click', (e) => archiveInventoryItem(e.currentTarget.dataset.id, item.itemName, item.isArchived));
}

function renderFinancialsRow(tableBody, record) {
    const row = tableBody.insertRow();
    row.insertCell().textContent = new Date(record.purchaseDate).toLocaleDateString();
    row.insertCell().textContent = record.itemName;
    row.insertCell().textContent = record.quantity;
    row.insertCell().textContent = `₱${record.price.toFixed(2)}`;
    row.insertCell().textContent = `₱${record.totalPrice.toFixed(2)}`;
    row.insertCell().textContent = record.description || 'N/A';
}

// =====================================================================
// --- DATA FETCHING & ACTIONS ---
// =====================================================================

async function handleApiResponse(response) {
    if (response.ok) {
        return response.json();
    }
    const errorText = await response.text();
    let errorMessage;
    try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || `Request failed with status ${response.status}`;
    } catch (e) {
        errorMessage = errorText;
        if (errorMessage.length > 150 || errorMessage.trim().startsWith('<!DOCTYPE')) {
            errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        }
    }
    throw new Error(errorMessage);
}

// --- Data Fetchers (now using the robust handleApiResponse helper) ---

async function fetchAndStoreAuditLogs(date = null) {
    try {
        let url = '/api/admin/audit-logs';
        if (date) url += `?date=${date}`;
        const res = await fetch(url);
        dataCaches.auditLog = await handleApiResponse(res);
        return dataCaches.auditLog;
    } catch (e) {
        console.error('Fetch Audit Logs Error:', e);
        alert(e.message);
        return null;
    }
}

async function fetchAndStoreUsers() { 
    try { 
        const res = await fetch('/api/admin/users'); 
        dataCaches.users = await handleApiResponse(res);
        return dataCaches.users; 
    } catch (e) { 
        console.error('Fetch Users Error:', e); 
        alert(e.message);
        return null; 
    } 
}

async function fetchAndStoreAppointments() { 
    try { 
        const url = `/api/admin/appointments?archived=${showingArchivedAppointments}`; 
        const res = await fetch(url); 
        dataCaches.appointments = await handleApiResponse(res);
        return dataCaches.appointments; 
    } catch (e) { 
        console.error('Fetch Appointments Error:', e);
        alert(e.message);
        return null; 
    } 
}

async function fetchAndStoreInventoryItems() { 
    try { 
        // Pass the state as a query parameter
        const url = `/api/admin/inventory?archived=${showingArchivedInventory}`;
        const res = await fetch(url); 
        dataCaches.inventory = await handleApiResponse(res);
        return dataCaches.inventory; 
    } catch (e) { 
        // ... (error handling is the same)
    } 
}

async function fetchAndStoreDoctors() { 
    try { 
        const res = await fetch('/api/admin/doctors'); 
        dataCaches.doctors = await handleApiResponse(res);
        return dataCaches.doctors; 
    } catch (e) { 
        console.error('Fetch Doctors Error:', e);
        alert(e.message);
        return null; 
    } 
}

async function fetchAndStoreStaff() {
    try { 
        const res = await fetch('/api/admin/staff'); 
        dataCaches.staff = await handleApiResponse(res);
        return dataCaches.staff; 
    } catch (e) { 
        console.error('Fetch Staff Error:', e);
        alert(e.message);
        return null; 
    } 
}

async function fetchAndStoreFinancials(monthYear) {
    if (!monthYear) return null;
    try {
        // --- THIS IS THE FIX: Call the admin route ---
        const response = await fetch(`/api/admin/financials?month=${monthYear}`);
        dataCaches.financials = await handleApiResponse(response);
        return dataCaches.financials;
    } catch (error) {
        console.error('Error loading financial records:', error);
        alert(error.message); // Display the specific error
        const tableBody = document.querySelector("#financials-table tbody");
        if(tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="error-cell">${error.message}</td></tr>`;
        return null;
    }
}

// --- Wrapper for on-demand loading and displaying financials ---
async function loadFinancialRecordsAdmin(monthYear) {
    const records = await fetchAndStoreFinancials(monthYear);
    if (records) {
         displayPaginatedTable('financials', records, 1);
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

async function archiveInventoryItem(id, name, isArchived) {
    const action = isArchived ? 'unarchive' : 'archive';
    if (!confirm(`Are you sure you want to ${action} "${name}"?`)) return;

    try {
        // Call the new PUT route
        await fetch(`/api/admin/inventory/${id}/archive`, { method: 'PUT' });
        
        // Refetch the list to update the view
        const data = await fetchAndStoreInventoryItems(); 
        displayPaginatedTable('inventory', data, 1);
        
        alert(`"${name}" has been ${action}d.`);
    } catch (error) { 
        console.error(`Error ${action}ing item:`, error); 
        alert(`Error: ${error.message}`); 
    }
}

// --- MODALS ---
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

        try {
            const response = await fetch('/api/admin/appointments', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData)
            });
            await handleApiResponse(response); // Use helper here
            modal.style.display = 'none';

            const appointments = await fetchAndStoreAppointments();
            displayPaginatedTable('appointments', appointments, 1); 

            updateDashboardStats({ appointments: dataCaches.appointments.length });
            alert('Appointment added!');
        } catch (error) { console.error('Error adding appointment:', error); alert(`Error: ${error.message}`); }
    };
}

function openAddDoctorModal() {
    const modal = document.getElementById('add-doctor-modal');
    const form = document.getElementById('add-doctor-form');
    const messageArea = document.getElementById('add-doctor-message-area');
    if (!modal || !form || !messageArea) return;
    form.reset();
    messageArea.textContent = '';
    modal.style.display = 'flex';
    form.onsubmit = async (e) => {
        e.preventDefault();
        messageArea.textContent = '';
        messageArea.style.color = 'red';
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        try {
            const response = await fetch('/api/admin/create-doctor', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            });
            const result = await handleApiResponse(response);
            alert('Doctor account created successfully!');
            modal.style.display = 'none';
            await loadAllAdminData();
        } catch (error) {
            console.error('Error creating doctor account:', error);
            messageArea.textContent = error.message;
        }
    };
}

function openAddStaffModal() {
    const modal = document.getElementById('add-staff-modal');
    const form = document.getElementById('add-staff-form');
    const messageArea = document.getElementById('add-staff-message-area');
    if (!modal || !form || !messageArea) return;
    form.reset();
    messageArea.textContent = '';
    modal.style.display = 'flex';
    form.onsubmit = async (e) => {
        e.preventDefault();
        messageArea.textContent = '';
        messageArea.style.color = 'red';
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        try {
            const response = await fetch('/api/admin/create-staff', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            });
            const result = await handleApiResponse(response);
            alert(
                `Staff account created successfully!\n\n` +
                `Default Password: ${result.defaultPassword}\n\n` +
                `Please share this with the staff member and advise them to change it upon their first login.`
            );
            modal.style.display = 'none';
            await loadAllAdminData();
        } catch (error) {
            console.error('Error creating staff account:', error);
            messageArea.textContent = error.message;
        }
    };
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
            await handleApiResponse(response);
            modal.style.display = 'none';

            const inventory = await fetchAndStoreInventoryItems();
            displayPaginatedTable('inventory', inventory, 1); 

            updateDashboardStats({ inventory: dataCaches.inventory.length });
            alert('Item added!');
        } catch (error) { console.error('Error adding item:', error); alert(`Error: ${error.message}`); }
    };
}

// --- Financials Modals & Handlers (from staff.js) ---
function openFinancialRecordModal() {
    const modal = document.getElementById('financial-record-modal');
    const form = document.getElementById('financial-record-form');
    form.reset();
    document.getElementById('fr-purchase-date').valueAsDate = new Date();
    modal.style.display = 'flex';
    form.onsubmit = handleAddFinancialRecord;
}

async function handleAddFinancialRecord(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const recordData = {
        itemName: form.querySelector('#fr-item-name').value,
        quantity: parseInt(form.querySelector('#fr-quantity').value),
        price: parseFloat(form.querySelector('#fr-price').value),
        purchaseDate: form.querySelector('#fr-purchase-date').value,
        description: form.querySelector('#fr-description').value,
    };

    try {
        // --- THIS IS THE FIX: Call the admin route ---
        const response = await fetch('/api/admin/financials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recordData)
        });
        await handleApiResponse(response);
        
        alert('Record saved successfully!');
        form.closest('.modal').style.display = 'none';
        
        await loadFinancialRecordsAdmin(currentFinancialsFilter);

    } catch (error) {
        console.error('Error saving financial record:', error);
        alert(`Error: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

// --- SEARCH FUNCTIONALITY ---
function setupSearchListeners() {
    const configs = [
        { 
            type: 'users', 
            filter: (item, term) => ((item.firstName || '').toLowerCase() + ' ' + (item.lastName || '').toLowerCase()).includes(term) || (item.signupEmail || '').toLowerCase().includes(term)
        },
        { 
            type: 'appointments', 
            filter: (item, term) => (item.patientName || '').toLowerCase().includes(term) || (item.doctorName || '').toLowerCase().includes(term)
        },
        { 
            type: 'inventory', 
            filter: (item, term) => (item.itemName || '').toLowerCase().includes(term)
        },
        { 
            type: 'doctors', 
             filter: (item, term) => ((item.userAccount?.firstName || '').toLowerCase() + ' ' + (item.userAccount?.lastName || '').toLowerCase()).includes(term) || (item.specialization?.name || '').toLowerCase().includes(term)
        },
        { 
            type: 'staff', 
            filter: (item, term) => ((item.firstName || '').toLowerCase() + ' ' + (item.lastName || '').toLowerCase()).includes(term) || (item.signupEmail || '').toLowerCase().includes(term)
        }
    ];

    configs.forEach(config => {
        const inputEl = document.getElementById(`${config.type}-search`);
        const btnEl = document.getElementById(`${config.type}-search-btn`);
        
        if (inputEl && btnEl) {
            const search = () => {
                const searchTerm = inputEl.value.toLowerCase().trim();
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
            inputEl.addEventListener('input', search);
        }
    });
}


// --- UI HELPERS & UTILITIES ---
function initializeModalEventListeners() {
    document.querySelectorAll('.modal:not(password-modal .modal)').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    });
    document.querySelectorAll('.close-modal, .modal .cancel-btn').forEach(btn => {
         if (!btn.closest('password-modal')) {
            btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none');
        }
    });
}

function updateArchivedInventoryButtonText() {
    const btn = document.getElementById('toggle-archived-inventory-btn');
    if (btn) {
        btn.innerHTML = showingArchivedInventory ? '<i class="fas fa-boxes"></i> View Active' : '<i class="fas fa-archive"></i> View Archived';
        btn.title = showingArchivedInventory ? "Show active inventory" : "Show archived inventory";
        
        const indicator = document.getElementById('inventory-view-indicator');
        if(indicator) indicator.textContent = showingArchivedInventory ? '(Archived)' : '(Active)';
    }
}

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

// --- Financials Report Generation (from staff.js) ---
function handleGenerateReport() {
    if (dataCaches.financials.length === 0) {
        alert("No data available for the selected month to generate a report.");
        return;
    }

    const monthYear = new Date(currentFinancialsFilter + '-02').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    let reportContent = `ImmaCare+ Financial Report\n`;
    reportContent += `Month: ${monthYear}\n`;
    reportContent += `Generated On: ${new Date().toLocaleString()}\n`;
    reportContent += `==================================================\n\n`;

    let totalExpenses = 0;
    dataCaches.financials.forEach(record => {
        reportContent += `Item:         ${record.itemName}\n`;
        reportContent += `Quantity:     ${record.quantity}\n`;
        reportContent += `Price (each): ₱${record.price.toFixed(2)}\n`;
        reportContent += `Total:        ₱${record.totalPrice.toFixed(2)}\n`;
        if (record.description) {
            reportContent += `Description:  ${record.description}\n`;
        }
        reportContent += `--------------------------------------------------\n`;
        totalExpenses += record.totalPrice;
    });

    reportContent += `\n==================================================\n`;
    reportContent += `TOTAL EXPENSE: ₱${totalExpenses.toFixed(2)}\n`;
    
    downloadReportAsTxt(reportContent, `Financial_Report_${currentFinancialsFilter}.txt`);
}

function downloadReportAsTxt(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) { 
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }