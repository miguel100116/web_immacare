// frontend/src/pages/staff.js

// --- Global State Variables at the top ---
let allPatients = [];
let allFinancialRecords = [];
let fullConsultationHistory = [];

const ITEMS_PER_PAGE = 10;
let currentHistoryPage = 1;
const CONSULTATIONS_PER_PAGE = 2;
let currentFinancialsPage = 1;
let currentFinancialsFilter = '';

// --- Main Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('staff-dashboard-container');
    if (!container) return;
    initializeStaffUI(); // This function will now correctly see all the functions below it.
});

// ==========================================================
// --- INITIALIZATION & UI SETUP ---
// ==========================================================

function initializeStaffUI() {
    // Tab switching logic
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

    initializeProfileSection();

    // Initialize Financials Section
    document.getElementById('add-financial-record-btn')?.addEventListener('click', openFinancialRecordModal);
    document.getElementById('generate-report-btn')?.addEventListener('click', handleGenerateReport);

    flatpickr("#financials-month-filter", {
        plugins: [
            new monthSelectPlugin({
              shorthand: true, 
              dateFormat: "Y-m",
              altFormat: "F Y",
            })
        ],
        onChange: function(selectedDates, dateStr, instance) {
            currentFinancialsFilter = dateStr;
            loadFinancialRecords(dateStr); // This call is now safe
        },
        onReady: function(selectedDates, dateStr, instance) {
            if (!instance.input.value) {
                const now = new Date();
                const year = now.getFullYear();
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const defaultMonth = `${year}-${month}`;
                instance.setDate(defaultMonth);
                currentFinancialsFilter = defaultMonth;
                loadFinancialRecords(defaultMonth); // This call is now safe
            }
        }
    });
    
    // Setup listeners for password modal, general modals, and search
    window.customElements.whenDefined('password-modal').then(() => {
        const openPasswordModalBtn = document.getElementById('open-password-modal-btn');
        const passwordModalComponent = document.querySelector('password-modal');
        if (openPasswordModalBtn && passwordModalComponent) {
            openPasswordModalBtn.addEventListener('click', () => {
                passwordModalComponent.show();
            });
        }
    });
    
    verifyStaffSession();
    initializeModalEventListeners();
    setupPatientSearch();
    loadPatientRecords(); // Initial load of patient data
}

function initializeModalEventListeners() {
    document.querySelectorAll('.modal:not(password-modal .modal)').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    });
    document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
        if (!btn.closest('password-modal')) {
             btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none');
        }
    });
}



// ==========================================================
// --- DATA LOADING & API CALLS ---
// ==========================================================

function initializeProfileSection() {
    const profileForm = document.getElementById('staff-profile-form');
    if (!profileForm) return;

    loadStaffProfileData();
    initializeStaffEditableFields();
    profileForm.addEventListener('submit', handleStaffProfileUpdate);
}

async function loadStaffProfileData() {
    const messageArea = document.getElementById('staff-profile-message-area');
    try {
        // We can reuse the /getUser endpoint as it has all the info we need
        const response = await fetch('/getUser');
        if (!response.ok) throw new Error('Could not fetch user data.');
        
        const user = await response.json();
        if (!user.loggedIn) {
            window.location.href = '/login.html';
            return;
        }

        // Map user data to the new form field IDs
        const fields = {
            'staff-profile-firstName': user.firstName,
            'staff-profile-lastName': user.lastName,
            'staff-profile-suffix': user.suffix,
            'staff-profile-age': user.age,
            'staff-profile-phone': user.phoneNumber,
            'staff-profile-address': user.address,
        };

        for (const id in fields) {
            const input = document.getElementById(id);
            if (input) {
                input.value = fields[id] || '';
                input.readOnly = true;
                input.classList.add('pre-filled');
            }
        }
    } catch (error) {
        messageArea.textContent = 'Error loading profile. Please refresh.';
        messageArea.className = 'message-area error';
    }
}

function initializeStaffEditableFields() {
    const profileForm = document.getElementById('staff-profile-form');
    profileForm.querySelectorAll('.edit-btn').forEach(button => {
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);
        if (input) {
            button.addEventListener('click', () => {
                input.readOnly = false;
                input.classList.remove('pre-filled');
                input.focus();
            });
        }
    });
}

async function handleStaffProfileUpdate(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('save-staff-profile-btn');
    const messageArea = document.getElementById('staff-profile-message-area');
    const profileForm = document.getElementById('staff-profile-form');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    messageArea.textContent = '';
    
    const formData = new FormData(profileForm);
    // This data structure matches the one expected by the /update-profile endpoint
    const dataToSave = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        suffix: formData.get('suffix'),
        Age: formData.get('age'),
        PhoneNumber: formData.get('phone'),
        Address: formData.get('address'),
    };

    try {
        // We can reuse the same backend endpoint used by the user profile page
        const response = await fetch('/update-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update profile.');

        messageArea.textContent = 'Profile updated successfully!';
        messageArea.className = 'message-area success';
        
        // Also update the name in the sidebar
        document.getElementById('staff-user-fullname').textContent = result.user.fullname || 'Staff';

        // Re-lock the fields
        profileForm.querySelectorAll('input').forEach(input => {
            input.readOnly = true;
            input.classList.add('pre-filled');
        });

    } catch (error) {
        messageArea.textContent = error.message;
        messageArea.className = 'message-area error';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

async function verifyStaffSession() {
    try {
        const response = await fetch('/getUser');
        if (!response.ok) throw new Error('Session check failed');
        const userData = await response.json();
        if (userData.loggedIn && (userData.isStaff || userData.isAdmin)) {
            document.getElementById('staff-user-fullname').textContent = userData.fullname || 'Staff';
        } else {
            window.location.href = '/login.html?message=Staff_access_required.';
        }
    } catch (error) {
        console.error("Error verifying staff session:", error);
        window.location.href = '/login.html?message=Session_error.';
    }
}

async function loadPatientRecords() {
    try {
        const response = await fetch('/api/staff/patients');
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to fetch patient records.');
        }
        const patients = await response.json();
        allPatients = patients;
        displayPaginatedPatients(allPatients, 1);
    } catch (error) {
        console.error('Error loading patient records:', error);
        const tableBody = document.querySelector("#patients-table tbody");
        tableBody.innerHTML = `<tr><td colspan="5" class="error-cell">${error.message}</td></tr>`;
    }
}

// --- THIS IS THE KEY FIX: The function is now defined at the top-level scope ---
async function loadFinancialRecords(monthYear) {
    if (!monthYear) return;
    try {
        const response = await fetch(`/api/staff/financials?month=${monthYear}`);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to fetch financial records.');
        }
        const records = await response.json();
        allFinancialRecords = records;
        displayPaginatedFinancials(allFinancialRecords, 1);
    } catch (error) {
        console.error('Error loading financial records:', error);
        const tableBody = document.querySelector("#financials-table tbody");
        tableBody.innerHTML = `<tr><td colspan="6" class="error-cell">${error.message}</td></tr>`;
    }
}


// ==========================================================
// --- DISPLAY & PAGINATION ---
// ==========================================================

function displayPaginatedPatients(patients, page) {
    // ... function content is fine ...
    const tableBody = document.querySelector("#patients-table tbody");
    const paginationControls = document.getElementById("patients-pagination");
    tableBody.innerHTML = '';

    if (!patients || patients.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">No patient records found.</td></tr>`;
        paginationControls.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(patients.length / ITEMS_PER_PAGE);
    page = Math.max(1, Math.min(page, totalPages));
    const start = (page - 1) * ITEMS_PER_PAGE;
    const paginatedItems = patients.slice(start, start + ITEMS_PER_PAGE);

    paginatedItems.forEach(patient => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = patient.fullname;
        row.insertCell().textContent = patient.signupEmail || 'N/A';
        row.insertCell().textContent = patient.PhoneNumber || 'N/A';
        const lastVisitDate = patient.lastVisit 
            ? new Date(patient.lastVisit).toLocaleDateString() 
            : 'N/A';
        row.insertCell().textContent = lastVisitDate;

        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `<button class="action-btn view-record-btn" data-user-id="${patient._id}" title="View/Edit Patient Record"><i class="fas fa-file-medical-alt"></i></button>`;
    });

    tableBody.querySelectorAll('.view-record-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.currentTarget.dataset.userId;
            openPatientRecordModal(userId);
        });
    });

    renderPaginationControls(paginationControls, page, totalPages, patients, displayPaginatedPatients);
}

function displayPaginatedFinancials(records, page) {
    // ... function content is fine ...
    const tableBody = document.querySelector("#financials-table tbody");
    const paginationControls = document.getElementById("financials-pagination");
    tableBody.innerHTML = '';

    if (!records || records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">No financial records found for this month.</td></tr>`;
        paginationControls.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
    currentFinancialsPage = Math.max(1, Math.min(page, totalPages));
    const start = (currentFinancialsPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = records.slice(start, start + ITEMS_PER_PAGE);

    paginatedItems.forEach(record => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = new Date(record.purchaseDate).toLocaleDateString();
        row.insertCell().textContent = record.itemName;
        row.insertCell().textContent = record.quantity;
        row.insertCell().textContent = `₱${record.price.toFixed(2)}`;
        row.insertCell().textContent = `₱${record.totalPrice.toFixed(2)}`;
        row.insertCell().textContent = record.description || 'N/A';
    });
    
    renderPaginationControls(paginationControls, currentFinancialsPage, totalPages, records, displayPaginatedFinancials);
}

function displayPaginatedHistory() {
    // ... function content is fine ...
    const listContainer = document.getElementById('consultation-history-list');
    const paginationContainer = document.getElementById('consultation-pagination');
    listContainer.innerHTML = '';
    paginationContainer.innerHTML = '';

    if (!fullConsultationHistory || fullConsultationHistory.length === 0) {
        listContainer.innerHTML = '<p>No consultation history found.</p>';
        return;
    }

    const totalPages = Math.ceil(fullConsultationHistory.length / CONSULTATIONS_PER_PAGE);
    currentHistoryPage = Math.max(1, Math.min(currentHistoryPage, totalPages));
    const start = (currentHistoryPage - 1) * CONSULTATIONS_PER_PAGE;
    const end = start + CONSULTATIONS_PER_PAGE;
    const paginatedHistory = fullConsultationHistory.slice(start, end);

    paginatedHistory.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        const itemDate = new Date(item.consultationDate).toLocaleString();
        itemDiv.innerHTML = `
            <div class="history-item-header">
                <strong>${itemDate}</strong> - Dr. ${item.attendingDoctor}
            </div>
            <p><strong>Complaint:</strong> ${item.complaint}</p>
            <p><strong>Diagnosis:</strong> ${item.diagnosis}</p>
            ${item.treatmentPlan ? `<p><strong>Treatment:</strong> ${item.treatmentPlan}</p>` : ''}
            ${item.notes ? `<p><strong>Notes:</strong> ${item.notes}</p>` : ''}
        `;
        listContainer.appendChild(itemDiv);
    });

    if (totalPages > 1) {
        paginationContainer.innerHTML = `
            <div class="nav-buttons">
                <button id="history-prev-btn" class="prev-btn" ${currentHistoryPage === 1 ? 'disabled' : ''}>Previous</button>
                <span>Page ${currentHistoryPage} of ${totalPages}</span>
                <button id="history-next-btn" class="next-btn" ${currentHistoryPage === totalPages ? 'disabled' : ''}>Next</button>
            </div>
        `;

        document.getElementById('history-prev-btn').addEventListener('click', () => {
            currentHistoryPage--;
            displayPaginatedHistory();
        });
        document.getElementById('history-next-btn').addEventListener('click', () => {
            currentHistoryPage++;
            displayPaginatedHistory();
        });
    }
}

function renderPaginationControls(container, currentPage, totalPages, originalData, displayFunction) {
    // ... function content is fine ...
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
    container.querySelector('.prev-btn').addEventListener('click', () => displayFunction(originalData, currentPage - 1));
    container.querySelector('.next-btn').addEventListener('click', () => displayFunction(originalData, currentPage + 1));
}

// ==========================================================
// --- EVENT HANDLERS & MODAL LOGIC ---
// ==========================================================

function setupPatientSearch() {
    // ... function content is fine ...
    const searchInput = document.getElementById('patients-search');
    const searchBtn = document.getElementById('patients-search-btn');

    const performSearch = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filteredPatients = searchTerm
            ? allPatients.filter(p => 
                (p.fullname || '').toLowerCase().includes(searchTerm) ||
                (p.signupEmail || '').toLowerCase().includes(searchTerm)
              )
            : allPatients;
        displayPaginatedPatients(filteredPatients, 1);
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('input', performSearch);
}

function openFinancialRecordModal() {
    // ... function content is fine ...
    const modal = document.getElementById('financial-record-modal');
    const form = document.getElementById('financial-record-form');
    form.reset();
    document.getElementById('fr-purchase-date').valueAsDate = new Date();
    modal.style.display = 'flex';
    form.onsubmit = handleAddFinancialRecord;
}

async function openPatientRecordModal(userId) {
    // ... function content is fine ...
    const modal = document.getElementById('patient-record-modal');
    const doctorSelect = document.getElementById('consult-doctor');
    modal.style.display = 'flex';

    document.getElementById('patient-modal-title').textContent = 'Loading Patient Record...';
    document.getElementById('modal-patient-name').textContent = '...';
    // (rest of the reset logic)

    try {
        const [recordResponse, doctorsResponse] = await Promise.all([
            fetch(`/api/staff/patient-record/${userId}`),
            fetch('/api/staff/doctors') 
        ]);

        if (!recordResponse.ok) throw new Error('Failed to fetch patient record.');
        if (!doctorsResponse.ok) throw new Error('Failed to fetch doctor list.');

        const record = await recordResponse.json();
        const doctors = await doctorsResponse.json();

        // (rest of the population logic)
        doctorSelect.innerHTML = '<option value="">Select a doctor</option>';
        doctors.forEach(doctor => {
            doctorSelect.add(new Option(doctor.fullname, doctor.fullname));
        });

        document.getElementById('patient-modal-title').textContent = `Record for ${record.user.fullname}`;
        document.getElementById('modal-patient-name').textContent = record.user.fullname;
        document.getElementById('modal-patient-email').textContent = record.user.signupEmail;
        document.getElementById('modal-patient-phone').textContent = record.user.PhoneNumber;
        document.getElementById('modal-patient-address').textContent = record.user.Address;
        document.getElementById('patient-record-id').value = record._id;
        
        fullConsultationHistory = record.consultationHistory || [];
        currentHistoryPage = 1;
        displayPaginatedHistory();
        
        document.getElementById('consultation-form').onsubmit = handleAddConsultation;

    } catch (error) {
        console.error('Error opening patient record modal:', error);
        document.getElementById('patient-modal-title').textContent = 'Error Loading Record';
        doctorSelect.innerHTML = '<option value="">Could not load doctors</option>';
    }
}

async function handleAddConsultation(event) {
    // ... function content is fine ...
    event.preventDefault();
    const form = event.target;
    const recordId = form.querySelector('#patient-record-id').value;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const consultationData = {
        attendingDoctor: form.querySelector('#consult-doctor').value,
        complaint: form.querySelector('#consult-complaint').value,
        diagnosis: form.querySelector('#consult-diagnosis').value,
        treatmentPlan: form.querySelector('#consult-treatment').value,
    };

    try {
        const response = await fetch(`/api/staff/patient-record/${recordId}/consultation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(consultationData)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to add note.');
        }

        const updatedRecord = await response.json();
        fullConsultationHistory = updatedRecord.consultationHistory;
        currentHistoryPage = 1;
        displayPaginatedHistory();
        form.reset();

    } catch (error) {
        console.error('Error adding consultation:', error);
        alert(error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Note';
    }
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
        const response = await fetch('/api/staff/financials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recordData)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save record.');
        }
        
        alert('Record saved successfully!');
        form.closest('.modal').style.display = 'none';
        
        // --- THIS CALL IS NOW SAFE ---
        loadFinancialRecords(currentFinancialsFilter);

    } catch (error) {
        console.error('Error saving financial record:', error);
        alert(`Error: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

function handleGenerateReport() {
    // ... function content is fine ...
    if (allFinancialRecords.length === 0) {
        alert("No data available for the selected month to generate a report.");
        return;
    }

    const monthYear = new Date(currentFinancialsFilter + '-02').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    let reportContent = `ImmaCare+ Financial Report\n`;
    reportContent += `Month: ${monthYear}\n`;
    reportContent += `Generated On: ${new Date().toLocaleString()}\n`;
    reportContent += `==================================================\n\n`;

    let totalExpenses = 0;
    allFinancialRecords.forEach(record => {
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