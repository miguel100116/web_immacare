document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorMsg = document.getElementById("errorMessage");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const signupEmail = form.signupEmail.value;
    const signupPassword = form.signupPassword.value;
    <p><a href="forgot-password.html">Forgot Password?</a></p>


    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ signupEmail, signupPassword })
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = data.redirect;
      } else {
        errorMsg.textContent = data.error || "Login failed. Please try again.";
      }
    } catch (err) {
      console.error("Login request error:", err);
      errorMsg.textContent = "Something went wrong. Please try again.";
    }
  });
});
