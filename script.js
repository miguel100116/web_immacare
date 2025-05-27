// document.addEventListener("DOMContentLoaded", () => {
//   const form = document.getElementById("signupForm");
//   const fullNameInput = document.getElementById("fullName");
//   const phoneInput = document.getElementById("PhoneNumber");
//   const emailInput = document.getElementById("signupEmail");
//   const password = document.getElementById("signupPassword");
//   const confirmPassword = document.getElementById("confirmPassword");

//   // Prevent special characters and numbers in full name
//   fullNameInput.addEventListener("input", () => {
//     fullNameInput.value = fullNameInput.value.replace(/[^A-Za-z\s]/g, "");
//   });

//   // Prevent typing anything other than numbers in phone input
//   phoneInput.addEventListener("input", () => {
//     phoneInput.value = phoneInput.value.replace(/[^0-9]/g, "").slice(0, 11);
//   });

//   form.addEventListener("submit", (e) => {
//     // Check password match
//     if (password.value !== confirmPassword.value) {
//       e.preventDefault();
//       alert("Passwords do not match.");
//       return;
//     }

//     // Extra email format check (though browser already does this)
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(emailInput.value)) {
//       e.preventDefault();
//       alert("Please enter a valid email address.");
//       return;
//     }

//     // Phone number should be exactly 11 digits and start with "09"
//     if (phoneInput.value.length !== 11 || !phoneInput.value.startsWith("09")) {
//       e.preventDefault();
//       alert("Phone number must be 11 digits and start with '09'.");
//       return;
//     }

//     // Final form is good
//     alert("Sign-up successful!");
//   });
// });
