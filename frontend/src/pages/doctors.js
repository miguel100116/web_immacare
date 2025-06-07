// frontend/src/pages/doctors.js

document.addEventListener('DOMContentLoaded', () => {
    const doctorListContainer = document.querySelector('.doctor-list');
    const specializationFilter = document.getElementById('specializationFilter');
    const nameFilter = document.getElementById('nameFilter');
    
    let allDoctors = []; // Cache for all doctors

    /**
     * Renders the doctor cards. Now extremely safe.
     */
    const renderDoctors = (doctorsToRender) => {
        doctorListContainer.innerHTML = ''; 
        
        // Filter out any doctors with broken links BEFORE trying to render.
        const validDoctors = doctorsToRender.filter(doctor => {
            if (!doctor.userAccount || !doctor.specialization) {
                console.warn('FILTERING OUT doctor with broken DB reference. ID:', doctor._id);
                return false; // Exclude this doctor
            }
            return true; // Include this doctor
        });

        if (validDoctors.length === 0) {
            doctorListContainer.innerHTML = '<p class="no-doctors-message">No doctors available.</p>';
            return;
        }

        validDoctors.forEach(doctor => {
            const card = document.createElement('div');
            card.className = 'doctor-card';
            
            const schedulesHtml = doctor.schedules?.length > 0 
                ? doctor.schedules.map(s => `<span>🗓 ${s}</span>`).join('<br/>') 
                : '<span>🗓 Schedule not available.</span>';
            
            const hmosHtml = doctor.acceptedHMOs?.length > 0 
                ? `<span>💳 ${doctor.acceptedHMOs.join(', ')}</span>` 
                : '';

            // This part is now guaranteed to be safe because of the filter above
            card.innerHTML = `
                <div class="avatar" style="background-image: url('${doctor.imageUrl || '/pics/default-avatar.png'}'); background-size: cover;"></div>
                <div class="info">
                    <h3>${doctor.userAccount.fullname}</h3>
                    <p class="specialization">${doctor.specialization.name}</p>
                    <p class="schedule">
                        ${schedulesHtml}<br/>
                        ${hmosHtml}
                    </p>
                    <button class="appointment-btn" 
                        data-doctor="${doctor._id}"
                        data-specialization="${doctor.specialization._id}">
                        Schedule an Appointment
                    </button>
                </div>
            `;
            doctorListContainer.appendChild(card);
        });
    };

    /**
     * Populates filters. Now extremely safe.
     */
    const populateFilters = (doctors, specializations) => {
        // Populate Specialization Filter
        specializationFilter.innerHTML = '<option value="">All Specializations</option>';
        if (specializations && specializations.length > 0) {
            specializations.forEach(spec => {
                specializationFilter.add(new Option(spec.name, spec._id));
            });
        }

        // Populate Doctor Name Filter
        nameFilter.innerHTML = '<option value="">All Doctors</option>';
        if (doctors && doctors.length > 0) {
            // Only add doctors that have a valid userAccount to the filter
            const validDoctorsForFilter = doctors.filter(doc => doc.userAccount);
            validDoctorsForFilter.forEach(doc => {
                nameFilter.add(new Option(doc.userAccount.fullname, doc.userAccount.fullname));
            });
        }
    };

    /**
     * Applies filters. Now extremely safe.
     */
    const applyFilters = () => {
        const selectedSpecId = specializationFilter.value;
        const selectedDoctorName = nameFilter.value;

        // Start with all valid doctors from the cache
        let filteredDoctors = allDoctors.filter(doc => doc.userAccount && doc.specialization);

        if (selectedSpecId) {
            filteredDoctors = filteredDoctors.filter(doc => doc.specialization._id === selectedSpecId);
        }

        if (selectedDoctorName) {
            filteredDoctors = filteredDoctors.filter(doc => doc.userAccount.fullname === selectedDoctorName);
        }

        renderDoctors(filteredDoctors);
    };

    /**
     * Main function to initialize the page.
     */
    const initializePage = async () => {
        try {
            const [doctorsResponse, specsResponse] = await Promise.all([
                fetch('/api/doctors'),
                fetch('/api/specializations')
            ]);

            if (!doctorsResponse.ok || !specsResponse.ok) {
                throw new Error('Network response was not ok.');
            }

            // Important: Handle potential empty or invalid JSON
            allDoctors = await doctorsResponse.json() || [];
            const allSpecs = await specsResponse.json() || [];
            
            populateFilters(allDoctors, allSpecs);
            renderDoctors(allDoctors);
            
            specializationFilter.addEventListener('change', applyFilters);
            nameFilter.addEventListener('change', applyFilters);

        } catch (error) {
            console.error("A critical error occurred while initializing the doctors page:", error);
            doctorListContainer.innerHTML = '<p class="no-doctors-message" style="color: red;">Could not load doctor information. Please try again later.</p>';
        }
    };

    // Event delegation for appointment buttons
    doctorListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('appointment-btn')) {
            const button = e.target;
            const doctorId = button.dataset.doctor;
            const specializationId = button.dataset.specialization;
            window.location.href = `/appointment.html?doctor=${doctorId}&specialization=${specializationId}`;
        }
    });

    initializePage();
});