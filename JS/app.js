function getApiBaseUrl() {
  if (!window.location.origin.startsWith("http")) {
    return "http://localhost:3000";
  }

  if (window.location.port && window.location.port !== "3000") {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  return window.location.origin;
}

const API_BASE_URL = getApiBaseUrl();

function formatCurrency(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function toggleModal(modalElement, shouldOpen) {
  modalElement.classList.toggle("hidden", !shouldOpen);
  modalElement.classList.toggle("flex", shouldOpen);
}

function parseOrderItems(items) {
  if (Array.isArray(items)) {
    return items;
  }

  if (typeof items === "string") {
    try {
      return JSON.parse(items);
    } catch (error) {
      console.error("Failed to parse order items:", error);
    }
  }

  return [];
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  return response;
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    throw new Error("The server returned an invalid response.");
  }
}
