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
    initializeNavigation(); 

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

    document.getElementById('inventory-sort-select')?.addEventListener('change', (event) => {
        sortAndDisplayInventory();
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

     document.getElementById('audit-log-text-search')?.addEventListener('input', () => {
        // When text changes, re-apply all filters
        applyAuditLogFilters();
    });

    // Date filter listener
    const dateFilterInput = document.getElementById('audit-log-date-filter');
    if (dateFilterInput) {
        flatpickr(dateFilterInput, {
            dateFormat: "Y-m-d",
            // When date changes, re-apply all filters
            onChange: function(selectedDates, dateStr, instance) {
                applyAuditLogFilters();
            },
            onClose: function(selectedDates, dateStr, instance) {
                if (instance.input.value === '') {
                    applyAuditLogFilters();
                }
            }
        });
    }
    
    // Clear button listener
    document.getElementById('audit-log-clear-filters-btn')?.addEventListener('click', async () => {
        // Clear both input fields
        const textSearchInput = document.getElementById('audit-log-text-search');
        if (textSearchInput) textSearchInput.value = '';
        if (dateFilterInput) flatpickr(dateFilterInput).clear();
        
        // Fetch ALL logs from the server to reset the cache and view
        await fetchAndStoreAuditLogs();
        displayPaginatedTable('auditLog', dataCaches.auditLog, 1);
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

async function applyAuditLogFilters() {
    const dateFilterInput = document.getElementById('audit-log-date-filter');
    const textSearchInput = document.getElementById('audit-log-text-search');
    const tableBody = document.querySelector('#auditLog-table tbody');

    // 1. Get current values from both filters
    const selectedDate = dateFilterInput.value;
    const searchTerm = textSearchInput.value.toLowerCase().trim();

    // 2. Show a loading state in the table
    if (tableBody) {
        const colSpan = tableBody.parentElement.querySelector('thead tr')?.cells.length || 4;
        tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading logs...</td></tr>`;
    }

    // 3. Fetch logs from the server, filtered by date.
    // The server is always the source of truth for the date filter.
    const logsFromServer = await fetchAndStoreAuditLogs(selectedDate);

    if (!logsFromServer) {
        displayPaginatedTable('auditLog', [], 1); // Show empty table on fetch failure
        return;
    }

    // 4. Apply the text search filter LOCALLY on the data that was just returned.
    let finalFilteredLogs = logsFromServer;
    if (searchTerm) {
        finalFilteredLogs = logsFromServer.filter(log => {
            const actor = (log.actorName || 'system').toLowerCase();
            return actor.includes(searchTerm);
        });
    }

    // 5. Display the final, fully filtered data
    displayPaginatedTable('auditLog', finalFilteredLogs, 1);
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
            inventory: inventoryItems?.length || 0,
            doctors: doctors?.length || 0,
            staff: staff?.length || 0
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
    
    actionsCell.innerHTML = `
            <button class="action-btn edit-btn" data-id="${item._id}" title="Edit Item" ${item.isArchived ? 'disabled' : ''}><i class="fas fa-edit"></i></button>
            <button class="action-btn archive-btn" data-id="${item._id}" title="${archiveButtonTitle}"><i class="fas ${archiveButtonIcon}"></i></button>
        `;    
    // Call the new archive function
    actionsCell.querySelector('.edit-btn').addEventListener('click', () => openEditInventoryItemModal(item));
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

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

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
        const url = `/api/admin/inventory?archived=${showingArchivedInventory}`;
        const res = await fetch(url); 
        dataCaches.inventory = await handleApiResponse(res);
        
        sortAndDisplayInventory(); 
        
    } catch (e) { 
        console.error("Error fetching inventory:", e);
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

async function validateInventoryItemName() {
    const nameInput = document.getElementById('inventory-item-name');
    const feedbackDiv = document.getElementById('inventory-name-feedback');
    const itemId = document.getElementById('inventory-item-id').value; // For the edit case
    
    const itemName = nameInput.value.trim();
    feedbackDiv.innerHTML = ''; // Clear previous feedback
    feedbackDiv.className = 'validation-feedback'; // Reset class

    if (itemName.length < 2) { // Don't check for very short strings
        return; 
    }

    try {
        let url = `/api/admin/inventory/check-name?name=${encodeURIComponent(itemName)}`;
        if (itemId) {
            url += `&excludeId=${itemId}`;
        }
        
        const response = await fetch(url);

        if (response.status === 409) { // 409 Conflict means it exists
            const data = await response.json();
            feedbackDiv.textContent = data.error;
            feedbackDiv.classList.add('error');
        } else if (response.ok) { // 200 OK means it's available
            feedbackDiv.innerHTML = '<i class="fas fa-check-circle"></i> Name is available';
            feedbackDiv.classList.add('success');
        }
        // We don't need to handle other errors here, as it might confuse the user during typing

    } catch (error) {
        console.error("Real-time validation network error:", error);
        // Don't show an error to the user, just fail silently for a better UX
        feedbackDiv.innerHTML = '';
    }
}

function sortAndDisplayInventory() {
    const sortValue = document.getElementById('inventory-sort-select').value;
    const itemsToSort = [...dataCaches.inventory]; // Create a mutable copy

    itemsToSort.sort((a, b) => {
        // --- THIS IS THE NEW DYNAMIC SORTING LOGIC ---
        if (sortValue.includes('stock_first') || sortValue === 'status') {
            let statusOrder;
            
            // Define the custom sort order based on the selected option
            if (sortValue === 'low_stock_first') {
                statusOrder = { 'Low Stock': 1, 'Out of Stock': 2, 'In Stock': 3 };
            } else if (sortValue === 'in_stock_first') {
                statusOrder = { 'In Stock': 1, 'Low Stock': 2, 'Out of Stock': 3 };
            } else { // Default is 'status' (Out of Stock first)
                statusOrder = { 'Out of Stock': 1, 'Low Stock': 2, 'In Stock': 3 };
            }

            const orderA = statusOrder[a.status] || 4; // Assign a low priority to any other status
            const orderB = statusOrder[b.status] || 4;
            
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            // If statuses are the same, sort by name as a secondary criterion
            return a.itemName.localeCompare(b.itemName);
        }

        // --- The rest of the sorting logic remains the same ---
        switch (sortValue) {
            case 'name_asc':
                return a.itemName.localeCompare(b.itemName);
            
            case 'name_desc':
                return b.itemName.localeCompare(a.itemName);

            case 'qty_asc':
                return a.quantity - b.quantity;

            case 'qty_desc':
                return b.quantity - a.quantity;

            default:
                return 0;
        }
    });

    displayPaginatedTable('inventory', itemsToSort, 1);
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

    const emailInput = document.getElementById('doctor-signupEmail');
    const feedbackDiv = document.getElementById('doctor-email-feedback');

    if (!modal || !form || !messageArea) return;
    form.reset();
    messageArea.textContent = '';

    feedbackDiv.innerHTML = '';
    feedbackDiv.className = 'validation-feedback';
    const debouncedEmailValidator = debounce(() => validateUserEmail('doctor-signupEmail', 'doctor-email-feedback'), 500);
    emailInput.addEventListener('input', debouncedEmailValidator);

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

    const emailInput = document.getElementById('staff-signupEmail');
    const feedbackDiv = document.getElementById('staff-email-feedback');

    if (!modal || !form || !messageArea) return;
    form.reset();
    messageArea.textContent = '';
    
    feedbackDiv.innerHTML = '';
    feedbackDiv.className = 'validation-feedback';
    const debouncedEmailValidator = debounce(() => validateUserEmail('staff-signupEmail', 'staff-email-feedback'), 500);
    emailInput.addEventListener('input', debouncedEmailValidator);

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

async function validateUserEmail(emailInputId, feedbackDivId) {
    const emailInput = document.getElementById(emailInputId);
    const feedbackDiv = document.getElementById(feedbackDivId);
    
    const email = emailInput.value.trim();
    feedbackDiv.innerHTML = ''; // Clear previous feedback
    feedbackDiv.className = 'validation-feedback'; // Reset class

    // A simple regex to check for a valid email format before hitting the server
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        if (email.length > 0) { // Only show error if user has started typing
             feedbackDiv.textContent = 'Please enter a valid email format.';
             feedbackDiv.classList.add('error');
        }
        return;
    }

    try {
        const url = `/api/admin/users/check-email?email=${encodeURIComponent(email)}`;
        const response = await fetch(url);

        if (response.status === 409) { // Email exists
            const data = await response.json();
            feedbackDiv.textContent = data.error;
            feedbackDiv.classList.add('error');
        } else if (response.ok) { // Email is available
            feedbackDiv.innerHTML = '<i class="fas fa-check-circle"></i> Email is available';
            feedbackDiv.classList.add('success');
        }

    } catch (error) {
        console.error("Real-time email validation network error:", error);
    }
}

function openAddInventoryItemModal() {
    const modal = document.getElementById('inventory-item-modal');
    const form = document.getElementById('inventory-item-form');

    const nameInput = document.getElementById('inventory-item-name');
    const feedbackDiv = document.getElementById('inventory-name-feedback');

    if (!modal || !form) return;
    form.reset();
    form.querySelector('#inventory-item-id').value = '';

    feedbackDiv.innerHTML = ''; // Clear feedback when opening modal
    feedbackDiv.className = 'validation-feedback';
    const debouncedValidator = debounce(validateInventoryItemName, 400); // 400ms delay
    nameInput.addEventListener('input', debouncedValidator);

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

function openEditInventoryItemModal(item) {
    const modal = document.getElementById('inventory-item-modal');
    const form = document.getElementById('inventory-item-form');
    if (!modal || !form) return;

    // Reset from any previous state and populate with item data
    form.reset();
    form.querySelector('#inventory-item-id').value = item._id;
    form.querySelector('#inventory-item-name').value = item.itemName;
    form.querySelector('#inventory-item-quantity').value = item.quantity;
    form.querySelector('#inventory-item-reorder-level').value = item.reorderLevel;
    form.querySelector('#inventory-item-description').value = item.description || '';
    
    // Change modal title for editing
    const modalTitle = document.getElementById('inventory-item-modal-title');
    if(modalTitle) modalTitle.textContent = 'Edit Inventory Item';

    // Display the modal
    modal.style.display = 'flex';

    // Set the form's onsubmit to handle the update logic
    form.onsubmit = async (e) => {
        e.preventDefault();
        const itemId = form.querySelector('#inventory-item-id').value;
        const updatedData = {
            itemName: form.querySelector('#inventory-item-name').value,
            quantity: parseInt(form.querySelector('#inventory-item-quantity').value, 10),
            reorderLevel: parseInt(form.querySelector('#inventory-item-reorder-level').value, 10),
            description: form.querySelector('#inventory-item-description').value,
        };

        try {
            const response = await fetch(`/api/admin/inventory/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            await handleApiResponse(response); // Reuse error handling
            
            modal.style.display = 'none';

            // Refresh the data and table
            const inventory = await fetchAndStoreInventoryItems();
            displayPaginatedTable('inventory', inventory, 1); 

            alert('Item updated successfully!');
        } catch (error) {
            console.error('Error updating item:', error);
            alert(`Error: ${error.message}`);
        }
    };
}

function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', async function(e) {
            e.preventDefault();

            // Handle active state for nav items
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');

            // Show the correct content section
            contentSections.forEach(section => section.classList.remove('active'));
            const targetId = this.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // --- SPECIAL LOGIC FOR AUDIT LOG REFRESH ---
              if (targetId === 'audit-log') {
                console.log("Audit Log tab clicked. Refreshing data and clearing filters...");
                const tableBody = document.querySelector('#auditLog-table tbody');
                
                // --- THIS IS THE CHANGE ---
                // Clear the filter inputs every time the tab is clicked
                const textSearchInput = document.getElementById('audit-log-text-search');
                const dateFilterInput = document.getElementById('audit-log-date-filter');
                if (textSearchInput) textSearchInput.value = '';
                if (dateFilterInput) flatpickr(dateFilterInput).clear();

                // Show a loading indicator
                if (tableBody) {
                    const colSpan = tableBody.parentElement.querySelector('thead tr')?.cells.length || 4;
                    tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading latest logs...</td></tr>`;
                }
                
                // Fetch all logs and display them
                const allLogs = await fetchAndStoreAuditLogs(); // Fetches ALL logs
                if (allLogs) {
                    displayPaginatedTable('auditLog', allLogs, 1);
                }
            }
        });
    });

    const toggleMenu = document.querySelector('.toggle-menu');
    const sidebar = document.querySelector('.sidebar');
    if (toggleMenu && sidebar) {
        toggleMenu.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
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
            // The scorer returns a number. Lower is better. Infinity means no match.
            scorer: (item, term) => {
                const firstName = (item.firstName || '').toLowerCase();
                const lastName = (item.lastName || '').toLowerCase();
                const email = (item.signupEmail || '').toLowerCase();
                const fullName = `${firstName} ${lastName}`;

                if (firstName.startsWith(term)) return 1; // Direct first name match is best
                if (fullName.startsWith(term)) return 2;   // Full name match is second best
                if (lastName.startsWith(term)) return 3;   // Last name match
                if (email.startsWith(term)) return 4;      // Email match
                return Infinity; // No "starts with" match
            }
        },
        { 
            type: 'appointments', 
            scorer: (item, term) => {
                const patientName = (item.patientName || '').toLowerCase();
                const doctorName = (item.doctorName || '').toLowerCase();

                if (patientName.startsWith(term)) return 1;
                if (doctorName.startsWith(term)) return 2;
                return Infinity;
            }
        },
        { 
            type: 'inventory', 
            scorer: (item, term) => {
                const itemName = (item.itemName || '').toLowerCase();
                return itemName.startsWith(term) ? 1 : Infinity;
            }
        },
        { 
            type: 'doctors', 
            scorer: (item, term) => {
                const firstName = (item.userAccount?.firstName || '').toLowerCase();
                const lastName = (item.userAccount?.lastName || '').toLowerCase();
                const specialization = (item.specialization?.name || '').toLowerCase();
                const fullName = `${firstName} ${lastName}`;

                if (firstName.startsWith(term)) return 1;
                if (fullName.startsWith(term)) return 2;
                if (specialization.startsWith(term)) return 3;
                return Infinity;
            }
        },
        { 
            type: 'staff', 
            scorer: (item, term) => {
                const firstName = (item.firstName || '').toLowerCase();
                const lastName = (item.lastName || '').toLowerCase();
                const email = (item.signupEmail || '').toLowerCase();
                const fullName = `${firstName} ${lastName}`;

                if (firstName.startsWith(term)) return 1;
                if (fullName.startsWith(term)) return 2;
                if (lastName.startsWith(term)) return 3;
                if (email.startsWith(term)) return 4;
                return Infinity;
            }
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

                // If search is empty, show the original, unsorted data
                if (!searchTerm) {
                    displayPaginatedTable(config.type, dataCache, 1);
                    return;
                }
                
                // 1. Map each item to an object with the item and its score
                const scoredData = dataCache.map(item => ({
                    item: item,
                    score: config.scorer(item, searchTerm)
                }));

                // 2. Filter out any items that didn't match (score is Infinity)
                const filteredData = scoredData.filter(scoredItem => scoredItem.score !== Infinity);

                // 3. Sort the matched items by their score (lowest score first)
                const sortedData = filteredData.sort((a, b) => a.score - b.score);
                
                // 4. Extract just the original items from the sorted list
                const finalData = sortedData.map(scoredItem => scoredItem.item);
                
                displayPaginatedTable(config.type, finalData, 1);
            };

            btnEl.addEventListener('click', search);
            // Use 'input' for real-time searching as the user types
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
    if (data.doctors !== undefined) {
        document.getElementById('dashboard-doctors-count').textContent = data.doctors;
    }
    if (data.staff !== undefined) {
        document.getElementById('dashboard-staff-count').textContent = data.staff;
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