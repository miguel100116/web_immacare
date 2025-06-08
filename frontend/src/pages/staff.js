// frontend/src/pages/staff.js
let allPatients = [];
const ITEMS_PER_PAGE = 10;
let fullConsultationHistory = [];
let currentHistoryPage = 1;
const CONSULTATIONS_PER_PAGE = 2;

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('staff-dashboard-container');
    if (!container) return;
    initializeStaffUI();
    loadPatientRecords();
});

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
    verifyStaffSession();
    initializeModalEventListeners();
    setupPatientSearch();
}

function initializeModalEventListeners() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    });
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none');
    });
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

function displayPaginatedPatients(patients, page) {
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

function renderPaginationControls(container, currentPage, totalPages, originalData, displayFunction) {
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

function setupPatientSearch() {
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

async function openPatientRecordModal(userId) {
    const modal = document.getElementById('patient-record-modal');
    const doctorSelect = document.getElementById('consult-doctor');
    modal.style.display = 'flex';

    document.getElementById('patient-modal-title').textContent = 'Loading Patient Record...';
    document.getElementById('modal-patient-name').textContent = '...';
    document.getElementById('modal-patient-email').textContent = '...';
    document.getElementById('modal-patient-phone').textContent = '...';
    document.getElementById('modal-patient-address').textContent = '...';
    document.getElementById('consultation-history-list').innerHTML = '<p>Loading history...</p>';
    document.getElementById('consultation-form').reset();
    document.getElementById('consultation-pagination').innerHTML = '';
    doctorSelect.innerHTML = '<option value="">Loading doctors...</option>';

    try {
        const [recordResponse, doctorsResponse] = await Promise.all([
            fetch(`/api/staff/patient-record/${userId}`),
            fetch('/api/staff/doctors') 
        ]);

        if (!recordResponse.ok) throw new Error('Failed to fetch patient record.');
        if (!doctorsResponse.ok) throw new Error('Failed to fetch doctor list.');

        const record = await recordResponse.json();
        const doctors = await doctorsResponse.json();

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
        
        // --- THIS IS THE FIX ---
        // 1. Store the full history and reset the page.
        fullConsultationHistory = record.consultationHistory || [];
        currentHistoryPage = 1;
        // 2. Call the NEW paginated display function.
        displayPaginatedHistory();
        // --- END OF FIX ---
        
        document.getElementById('consultation-form').onsubmit = handleAddConsultation;

    } catch (error) {
        console.error('Error opening patient record modal:', error);
        document.getElementById('patient-modal-title').textContent = 'Error Loading Record';
        doctorSelect.innerHTML = '<option value="">Could not load doctors</option>';
    }
}

function displayPaginatedHistory() {
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

// --- THIS FUNCTION IS NOW REMOVED ---
// function renderConsultationHistory(history) { ... }

async function handleAddConsultation(event) {
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