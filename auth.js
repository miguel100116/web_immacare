window.onload = async () => {
  try {
    // Fetch user session info, include credentials to send cookies
    const res = await fetch("/getUser", { credentials: "include" });
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();

    const loginLink = document.getElementById("login-link");
    if (loginLink) {
      if (data.loggedIn) {
        loginLink.innerText = "PROFILE";
        loginLink.setAttribute("data-nav", "profile.html");
        loginLink.setAttribute("href", "#profile");
      } else {
        loginLink.innerText = "LOGIN";
        loginLink.setAttribute("data-nav", "login.html");
        loginLink.setAttribute("href", "#login");
      }
    }
  } catch (err) {
    console.error("Login check failed:", err);
  }

  // Add click event listeners to all navbar links
  document.querySelectorAll('.navbar a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetPage = link.getAttribute('');
      if (targetPage) {
        window.location.href = targetPage;
      }
    });
  });
};
