const loginForm = document.querySelector("#loginForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const errorMessage = document.querySelector("#loginError");
const submitButton = document.querySelector("#submitButton");
const isPagesDemo = window.location.hostname.endsWith("github.io");
const demoProfile = { name: "Player one", email: "player@playroom.test" };

if (isPagesDemo) {
  if (localStorage.getItem("playroomPagesDemoUser")) window.location.replace("./portal.html");
} else {
  fetch("/api/auth/me")
    .then((response) => response.json())
    .then((result) => {
      if (result.authenticated) window.location.replace("./portal.html");
    })
    .catch(() => {});
}

document.querySelector("#fillDemo").addEventListener("click", () => {
  emailInput.value = "player@playroom.test";
  passwordInput.value = "playroom123";
  passwordInput.focus();
});

document.querySelector("#togglePassword").addEventListener("click", (event) => {
  const visible = passwordInput.type === "password";
  passwordInput.type = visible ? "text" : "password";
  event.currentTarget.textContent = visible ? "Hide" : "Show";
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;
  submitButton.disabled = true;
  submitButton.innerHTML = "Signing in...";

  try {
    if (isPagesDemo) {
      if (emailInput.value.trim().toLowerCase() !== demoProfile.email || passwordInput.value !== "playroom123") {
        throw new Error("Use the demo sign-in details shown below the form.");
      }
      localStorage.setItem("playroomPagesDemoUser", JSON.stringify(demoProfile));
      window.location.assign("./portal.html");
      return;
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: passwordInput.value
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Sign-in failed. Please try again.");
    window.location.assign("./portal.html");
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Sign in <span>→</span>';
  }
});
