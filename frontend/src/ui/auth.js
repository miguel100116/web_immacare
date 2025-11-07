// auth.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("userDataForm");
  const modal = document.getElementById("confirmationModal");
  const closeBtn = modal.querySelector(".close");
  const confirmBtn = modal.querySelector("#confirmBtn");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Show confirmation modal
    modal.style.display = "block";
  });

  closeBtn.onclick = () => {
    modal.style.display = "none";
  };

  confirmBtn.onclick = () => {
    modal.style.display = "none";
    form.submit(); // Continue submission after confirmation
  };

  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
});
