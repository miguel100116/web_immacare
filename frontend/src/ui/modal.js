/**
 * Initializes the confirmation modal for any form with the ID "userDataForm".
 */
export function initializeConfirmationModal() {
  const form = document.getElementById("userDataForm");
  const modal = document.getElementById("confirmationModal");

  if (!form || !modal) {
    return; // Do nothing if the required elements aren't on this page
  }

  const closeBtn = modal.querySelector(".close");
  const confirmBtn = modal.querySelector("#confirmBtn");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    modal.style.display = "block";
  });

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };
  }

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      modal.style.display = "none";
      form.submit();
    };
  }

  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}