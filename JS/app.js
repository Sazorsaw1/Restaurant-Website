const API_BASE_URL = "http://localhost:3000";

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
