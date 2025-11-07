// frontend/src/pages/myappointments.js

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector("#appointmentsTable tbody");
  const messageArea = document.getElementById('message-area');

  // Check for success/error messages from the URL (from form submission)
  const urlParams = new URLSearchParams(window.location.search);
  const message = urlParams.get('message');
  if (message && messageArea) {
    messageArea.textContent = decodeURIComponent(message);
    // Add a class to style the success message
    messageArea.className = 'success-message'; 
  }

  if (!tableBody) return; // Exit if the table isn't on the page

  // Fetch the user's appointments from the backend
  fetch("/api/appointments/get-appointments")
    .then((res) => {
        if (!res.ok) {
            throw new Error(`Network response was not ok, status: ${res.status}`);
        }
        return res.json();
    })
    .then((data) => {
      tableBody.innerHTML = ''; // Clear the "Loading..." message

      if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">You have no appointments scheduled.</td></tr>`;
        return;
      }

      // Loop through the appointment data and build the table rows
       data.forEach((app) => {
        const row = document.createElement("tr");

        const specializationName = app.specialization?.name || 'N/A';
        const doctorName = app.doctor?.userAccount?.fullname || 'N/A';
        const patientName = app.patientName || 'N/A';
        const formattedDate = new Date(app.date).toLocaleDateString();

        let actionsHtml = '';
        if (app.status === 'Scheduled') {
            actionsHtml = `
                <button class="resched-btn"
                        data-id="${app._id}"
                        data-doctor="${app.doctor?._id}"
                        data-spec="${app.specialization?._id}"
                        data-reason="${app.reason || ''}">Reschedule</button>
                <button class="cancel-btn" data-id="${app._id}">Cancel</button>
            `;
        } else {
            // Your status color logic is already perfect
            let statusColor = 'green'; // Default for 'Completed'
            if (app.status === 'Cancelled') {
                statusColor = 'red';
            } else if (app.status === 'Rescheduled') {
                statusColor = '#ffc107'; // A nice amber/yellow color
            }
            actionsHtml = `<span style="font-weight: bold; color: ${statusColor};">${app.status}</span>`;
        }

        row.innerHTML = `
          <td>${formattedDate}</td>
          <td>${app.time}</td>
          <td>${doctorName}</td>
          <td>${patientName}</td>
          <td>${specializationName}</td>
          <td>${app.reason || 'N/A'}</td>
          <td>${actionsHtml}</td>
        `;

        if (app.status !== 'Scheduled') {
            row.style.opacity = '0.6';
        }

        tableBody.appendChild(row);
      });
    })
    .catch((err) => {
      console.error("❌ Failed to load appointments:", err);
      tableBody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Could not load your appointments.</td></tr>`;
    });

    // Use a single event listener on the table body for better performance
    tableBody.addEventListener('click', (e) => {
        const button = e.target;
        const appointmentId = button.dataset.id;
        const appointmentRow = button.closest('tr');

        // --- 1. HANDLE CANCEL BUTTON ---
        if (button.classList.contains('cancel-btn')) {
            if (confirm("Are you sure you want to cancel this appointment?")) {
                fetch(`/api/appointments/cancel-appointment/${appointmentId}`, { 
                    method: "PUT"
                })
                .then(res => {
                    if (!res.ok) throw new Error('Cancellation failed');
                    // No need to reload the page, just update the UI
                    button.closest('td').innerHTML = '<span style="color: red; font-weight: bold;">Cancelled</span>';
                    appointmentRow.style.opacity = '0.6';
                })
                .catch(err => {
                    console.error("❌ Failed to cancel:", err);
                    alert('Could not cancel the appointment.');
                });
            }
        }

        // --- 2. HANDLE RESCHEDULE BUTTON ---
        if (button.classList.contains('resched-btn')) {
            if (confirm("This will take you to the appointment form to pick a new date and time. Continue?")) {
                const doctorId = button.dataset.doctor;
                const specId = button.dataset.spec;
                const reason = button.dataset.reason;

                // Build the URL with query parameters to pre-fill the form
                const url = new URL('/appointment.html', window.location.origin);
                url.searchParams.append('rescheduleOf', appointmentId);
                url.searchParams.append('doctor', doctorId);
                url.searchParams.append('specialization', specId);
                url.searchParams.append('reason', encodeURIComponent(reason));
                
                window.location.href = url.toString();
            }
        }
    });
});