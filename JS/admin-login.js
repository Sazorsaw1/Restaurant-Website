const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginButton = document.getElementById("adminLoginButton");
const loginMessage = document.getElementById("loginMessage");

function showLoginMessage(message, isError = false) {
  loginMessage.textContent = message;
  loginMessage.className = `rounded-2xl border px-4 py-3 text-sm ${isError ? "border-red-300 bg-red-50 text-red-600" : "border-green-300 bg-green-50 text-green-700"}`;
}

async function redirectIfLoggedIn() {
  try {
    const response = await apiFetch("/admin/session", {
      method: "GET",
    });

    if (response.ok) {
      window.location.href = `${API_BASE_URL}/admin`;
    }
  } catch (error) {
    console.error(error);
  }
}

async function loadSetupStatus() {
  try {
    const response = await apiFetch("/admin/setup-status", {
      method: "GET",
    });

    if (!response.ok) {
      return;
    }

    const data = await readJsonResponse(response);
    if (!data.hasAdminUsers) {
      showLoginMessage("No admin account exists yet. Run `npm run create:admin -- <username> <password> \"Full Name\"` inside the Backend folder first.", true);
    }
  } catch (error) {
    console.error(error);
  }
}

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(adminLoginForm);
  const payload = {
    username: String(formData.get("username") || "").trim(),
    password: String(formData.get("password") || ""),
  };

  adminLoginButton.disabled = true;
  adminLoginButton.textContent = "Signing In...";
  loginMessage.className = "hidden";
  loginMessage.textContent = "";

  try {
    const response = await apiFetch("/admin/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || "Login failed.");
    }

    showLoginMessage("Login successful. Redirecting...");
    window.setTimeout(() => {
      window.location.href = `${API_BASE_URL}/admin`;
    }, 500);
  } catch (error) {
    console.error(error);
    showLoginMessage(error.message || "Login failed.", true);
  } finally {
    adminLoginButton.disabled = false;
    adminLoginButton.textContent = "Sign In";
  }
});

redirectIfLoggedIn();
loadSetupStatus();
