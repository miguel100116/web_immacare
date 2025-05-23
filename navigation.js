// function togglePassword() {
//   let passwordField = document.getElementById("password");
//   passwordField.type = passwordField.type === "password" ? "text" : "password";
// }
// document.addEventListener("DOMContentLoaded", function () {
//   // Select all elements with the 'data-nav' attribute
//   document.querySelectorAll("[data-nav]").forEach(link => {
//     link.addEventListener("click", function (e) {
//       e.preventDefault(); // Stops the default behavior (navigation)
//       const target = this.getAttribute("data-nav"); // Get the URL from 'data-nav' attribute
//       if (target) {
//         window.location.href = target; 
//       }
//     });
//   });
// });

// //login

// // Optional: Auto-hide modal after X seconds if needed
// // setTimeout(() => showLogin(), 5000);

// // const carouselTrack = document.getElementById("carousel-track");

// // carouselTrack.addEventListener("mouseenter", () => {
// //   carouselTrack.style.animationPlayState = "paused";
// // });

// // carouselTrack.addEventListener("mouseleave", () => {
// //   carouselTrack.style.animationPlayState = "running";
// // });


// //filtering doctors and etc..\


// //filter doctor/name
// // JavaScript code for filtering functionality
// document.addEventListener('DOMContentLoaded', function() {
//   const specializationFilter = document.getElementById('specializationFilter');
//   const nameFilter = document.getElementById('nameFilter');
  
//   // Function to filter doctors based on specialization and name
//   function filterDoctors() {
//     const selectedSpecialization = specializationFilter.value.toLowerCase();
//     const selectedName = nameFilter.value.toLowerCase();
//     const doctorCards = document.querySelectorAll('.doctor-card');
//     let doctorFound = false;

//     doctorCards.forEach(card => {
//       const doctorName = card.querySelector('h3').innerText.toLowerCase() || '';
//       const doctorSpecialization = card.querySelector('.specialization').innerText.toLowerCase() || '';

//       // Check if the card matches both selected specialization and name
//       if (
//         (selectedSpecialization === '' || doctorSpecialization.includes(selectedSpecialization)) &&
//         (selectedName === '' || doctorName.includes(selectedName))
//       ) {
//         card.style.display = 'block';  // show
//         doctorFound = true;
//       } else {
//         card.style.display = 'none';   // hide
//       }
//     });

//     // Show a message if no doctors match the filters
//     const noDoctorsMessage = document.getElementById('noDoctorsMessage');
//     if (!doctorFound) {
//       if (!noDoctorsMessage) {
//         const message = document.createElement('p');
//         message.id = 'noDoctorsMessage';
//         message.textContent = 'No doctors available for the selected filters.';
//         message.style.color = 'red';
//         message.style.textAlign = 'center';
//         message.style.fontWeight = 'bold';
//         document.querySelector('.doctor-list').appendChild(message);
//       }
//     } else {
//       const existingMessage = document.getElementById('noDoctorsMessage');
//       if (existingMessage) {
//         existingMessage.remove();  // Remove the message if doctors are found
//       }
//     }
//   }

//   // Attach the event listeners
//   specializationFilter.addEventListener('change', filterDoctors);
//   nameFilter.addEventListener('change', filterDoctors);
// });


// //appointment button
// document.addEventListener('DOMContentLoaded', function () {
//   const buttons = document.querySelectorAll('.appointment-btn');

//   buttons.forEach(button => {
//     button.addEventListener('click', function () {
//       const card = button.closest('.doctor-card');
//       const name = card.querySelector('h3')?.innerText.trim();
//       const specialization = card.querySelector('.specialization')?.innerText.trim();

//       if (name && specialization) {
//         const url = `appointment.html?name=${encodeURIComponent(name)}&specialization=${encodeURIComponent(specialization)}`;
//         window.location.href = url;
//       }
//     });
//   });
// });








// Toggle password visibility
function togglePassword() {
  const passwordField = document.getElementById("password");
  if (passwordField) {
    passwordField.type = passwordField.type === "password" ? "text" : "password";
  }
}
function togglePassword() {
  const passwordField = document.getElementById("confirmPassword");
  if (passwordField) {
    passwordField.type = passwordField.type === "confirmPassword" ? "text" : "confirmPassword";
  }
}

// Debounce utility to optimize input events
function debounce(func, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Run all scripts after DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Navigation links using data-nav attribute
  document.querySelectorAll("[data-nav]").forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const target = this.getAttribute("data-nav");
      if (target) {
        window.location.href = target;
      }
    });
  });

  // Doctor filtering logic
  const specializationFilter = document.getElementById('specializationFilter');
  const nameFilter = document.getElementById('nameFilter');

  function filterDoctors() {
    const selectedSpecialization = specializationFilter?.value.toLowerCase() || '';
    const selectedName = nameFilter?.value.toLowerCase() || '';
    const doctorCards = document.querySelectorAll('.doctor-card');
    let doctorFound = false;

    doctorCards.forEach(card => {
      const doctorName = card.querySelector('h3')?.innerText.toLowerCase() || '';
      const doctorSpecialization = card.querySelector('.specialization')?.innerText.toLowerCase() || '';

      if (
        (selectedSpecialization === '' || doctorSpecialization.includes(selectedSpecialization)) &&
        (selectedName === '' || doctorName.includes(selectedName))
      ) {
        card.style.display = 'block';
        doctorFound = true;
      } else {
        card.style.display = 'none';
      }
    });

    // Handle "no doctors" message
    const existingMessage = document.getElementById('noDoctorsMessage');
    if (!doctorFound) {
      if (!existingMessage) {
        const message = document.createElement('p');
        message.id = 'noDoctorsMessage';
        message.textContent = 'No doctors available for the selected filters.';
        message.style.color = 'red';
        message.style.textAlign = 'center';
        message.style.fontWeight = 'bold';
        document.querySelector('.doctor-list')?.appendChild(message);
      }
    } else if (existingMessage) {
      existingMessage.remove();
    }
  }

  // Attach debounced filtering
  if (specializationFilter) {
    specializationFilter.addEventListener('change', debounce(filterDoctors));
  }

  if (nameFilter) {
    nameFilter.addEventListener('input', debounce(filterDoctors));
  }

  // // Appointment button logic
  // const appointmentButtons = document.querySelectorAll('.appointment-btn');

  // appointmentButtons.forEach(button => {
  //   button.addEventListener('click', function () {
  //     const card = button.closest('.doctor-card');
  //     const name = card.querySelector('h3')?.innerText.trim();
  //     const specialization = card.querySelector('.specialization')?.innerText.trim();

  //     if (name && specialization) {
  //       const url = `appointment.html?name=${encodeURIComponent(name)}&specialization=${encodeURIComponent(specialization)}`;
  //       window.location.href = url;
  //     }
  //   });
  // });

});

//confirmation logic
document.addEventListener('DOMContentLoaded', function () {
  const appointmentForm = document.querySelector('.appointment-form');
  const confirmationModal = document.getElementById('confirmationModal');
  const confirmBtn = document.getElementById('confirmBtn');
  const closeModal = document.querySelector('.close');

  // Event listener for form submission
  appointmentForm.addEventListener('submit', function (e) {
      e.preventDefault(); // Prevent form submission to server

      const name = document.getElementById('name').value;
      const address = document.getElementById('address').value;
      const age = document.getElementById('age').value;
      const phone = document.getElementById('phone').value;
      const specialization = document.getElementById('specialization').value;
      const doctor = document.getElementById('doctorName').value;
      const date = document.getElementById('date').value;
      const time = document.getElementById('time').value;
      const reason = document.getElementById('reason').value;

      // Set the confirmation message with the submitted form data
      const confirmationMessage = `
          Name: ${name} <br>
          Address: ${address} <br>
          Age: ${age} <br>
          Phone: ${phone} <br>
          Specialization: ${specialization} <br>
          Doctor: ${doctor} <br>
          Date: ${date} <br>
          Time: ${time} <br>
          Reason: ${reason}
      `;

      document.getElementById('confirmationMessage').innerHTML = confirmationMessage;

      // Show the modal
      confirmationModal.style.display = 'block';
  });

  // Close the modal when the user clicks on <span> (x)
  closeModal.addEventListener('click', function () {
      confirmationModal.style.display = 'none';
  });

  // Close the modal when the user clicks the "Confirm" button
  confirmBtn.addEventListener('click', function () {
      confirmationModal.style.display = 'none';
      // You can also add logic here to submit the form data to your server if needed
      alert('Appointment confirmed!');
      // Optionally, redirect to a different page or clear the form
      appointmentForm.reset();
  });

  // Close the modal if the user clicks outside of the modal
  window.addEventListener('click', function (event) {
      if (event.target === confirmationModal) {
          confirmationModal.style.display = 'none';
      }
  });
});



//schdule logic
function scheduleAppointment(button) {
  const doctor = button.dataset.doctor;
  const specialization = button.dataset.specialization;
  
  // Store in localStorage
  localStorage.setItem('selectedDoctor', doctor);
  localStorage.setItem('selectedSpecialization', specialization);
  
  // Navigate to the appointment page
  window.location.href = button.dataset.nav;
}

// When the Appointment page is loaded, set form values from localStorage
document.addEventListener('DOMContentLoaded', function () {
  const doctor = localStorage.getItem('selectedDoctor');
  const specialization = localStorage.getItem('selectedSpecialization');
  
  // Set form values if available
  if (doctor && specialization) {
      document.getElementById('doctorName').value = doctor;
      document.getElementById('specialization').value = specialization;
      
      // Clear storage after use
      localStorage.removeItem('selectedDoctor');
      localStorage.removeItem('selectedSpecialization');
  }
});

//hide the other in learnmore
document.addEventListener("DOMContentLoaded", function() {
  const sectionId = window.location.hash.substring(1); // Get the fragment from the URL
  if (sectionId) {
      const section = document.getElementById(sectionId);
      if (section) {
          section.style.display = 'block'; // Show the selected section
      }
  }
});


document.getElementById("login-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const signupEmail = e.target.signupEmail.value;
  const signupPassword = e.target.signupPassword.value;

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ signupEmail, signupPassword })
    });

    const result = await response.text();

    if (result.includes("✅ Login successful") || response.redirected) {
      // ✅ Set flag in localStorage
      localStorage.setItem("isLoggedIn", "true");

      // ✅ Redirect to main.html
      window.location.href = "/main.html";
    } else {
      alert(result); // ❌ Show error message (wrong password/email)
    }
  } catch (err) {
    console.error("Login failed", err);
    alert("❌ Login failed due to a server error.");
  }
});



//NEW TODAY
// window.onload = async () => {
//       try {
//         const res = await fetch("/getUser");
//         if (!res.ok) throw new Error("Network error");
//         const data = await res.json();

//         if (data.loggedIn) {
//           document.getElementById("login-link").innerHTML =
//             `<a href="#" onclick="showProfile()">PROFILE</a>`;
//           document.getElementById("profile-name").innerText = data.fullname;
//           document.getElementById("profile-email").innerText = data.signupEmail;
//         }
//       } catch (err) {
//         console.error("Error fetching user info:", err);
//       }
//     };

//     function showProfile() {
//       const profileSection = document.getElementById("profile-section");
//       profileSection.style.display =
//         profileSection.style.display === "block" ? "none" : "block";
//     }

//     function logout() {
//       window.location.href = "/logout";
//     }

// 2nd
// window.onload = async () => {
//   try {
//     const res = await fetch("/getUser");
//     if (!res.ok) throw new Error("Network error");

//     const data = await res.json();

//     const loginLink = document.getElementById("login-link");

//     if (data.loggedIn) {
//       loginLink.innerHTML = `<a href="profile.html">PROFILE</a>`;
//     } else {
//       loginLink.innerHTML = `<a href="login.html">LOGIN</a>`;
//     }
//   } catch (err) {
//     console.error("Error fetching user info:", err);
//   }
// };


// window.onload = async () => {
//   try {
//     const res = await fetch("/getUser", { credentials: "include" });
//     if (!res.ok) throw new Error("Network error");

//     const data = await res.json();

//     const loginLink = document.getElementById("login-link");
//     const signupLink = document.getElementById("signup-link");
//     const navLinks = document.getElementById("nav-links");

//     if (data.loggedIn) {
//       loginLink.innerHTML = "PROFILE";
//       loginLink.href = "profile.html";

//       if (signupLink) signupLink.style.display = "none";

//       if (!document.getElementById("logout-link")) {
//         const logoutLink = document.createElement("a");
//         logoutLink.href = "/logout";
//         logoutLink.id = "logout-link";
//         logoutLink.innerText = "LOGOUT";
//         navLinks.appendChild(logoutLink);
//       }
//     } else {
//       loginLink.innerHTML = "LOGIN";
//       loginLink.href = "login.html";

//       if (signupLink) signupLink.style.display = "inline";

//       const logoutLink = document.getElementById("logout-link");
//       if (logoutLink) logoutLink.remove();
//     }
//   } catch (err) {
//     console.error("Error fetching user info:", err);
//   }
// };

