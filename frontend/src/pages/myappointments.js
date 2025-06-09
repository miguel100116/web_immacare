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

        const specializationName = app.specializationName || 'N/A';
        const doctorName = app.doctorName || 'N/A'; 
        const patientName = app.patientName || 'N/A'; // This now comes from the transformed data
        const formattedDate = new Date(app.date).toLocaleDateString();

        row.innerHTML = `
          <td>${formattedDate}</td>
          <td>${app.time}</td>
          <td>${doctorName}</td>
          <td>${patientName}</td>
          <td>${specializationName}</td>
          <td>${app.reason || 'N/A'}</td>
          <td>
            <button class="cancel-btn" data-id="${app._id}">Cancel</button>
          </td>
        `;
        tableBody.appendChild(row);
      });
    })
    .catch((err) => {
      console.error("❌ Failed to load appointments:", err);
      tableBody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Could not load your appointments.</td></tr>`;
    });

    // Use a single event listener on the table body for better performance
    tableBody.addEventListener('click', (e) => {
        // Handle Cancel button clicks
        if (e.target.classList.contains('cancel-btn')) {
            const id = e.target.dataset.id;
            if (confirm("Are you sure you want to cancel this appointment?")) {
                fetch(`/api/appointments/cancel-appointment/${id}`, { method: "DELETE" })
                .then(res => {
                    if(!res.ok) throw new Error('Cancellation failed');
                    // Reload the page to show the updated list
                    location.reload();
                })
                .catch(err => {
                    console.error("❌ Failed to cancel:", err);
                    alert('Could not cancel the appointment.');
                });
            }
        }
    });
});