const ORDER_STATUSES = ["Pending", "Preparing", "Ready", "Completed"];

const adminGreeting = document.getElementById("adminGreeting");
const dashboardMessage = document.getElementById("dashboardMessage");
const adminOrdersList = document.getElementById("adminOrdersList");
const refreshOrdersBtn = document.getElementById("refreshOrdersBtn");
const logoutBtn = document.getElementById("logoutBtn");
const menuSectionHint = document.getElementById("menuSectionHint");
const menuCreateForm = document.getElementById("menuCreateForm");
const menuCreateButton = document.getElementById("menuCreateButton");
const menuManagementList = document.getElementById("menuManagementList");
const usersPanelTrigger = document.getElementById("usersPanelTrigger");
const userManagementList = document.getElementById("userManagementList");
const createUserForm = document.getElementById("createUserForm");
const createUserButton = document.getElementById("createUserButton");
const adminPanelTriggers = Array.from(document.querySelectorAll("[data-admin-panel-trigger]"));
const adminPanels = Array.from(document.querySelectorAll("[data-admin-panel]"));

const statTotalOrders = document.getElementById("statTotalOrders");
const statPendingOrders = document.getElementById("statPendingOrders");
const statPreparingOrders = document.getElementById("statPreparingOrders");
const statClosedOrders = document.getElementById("statClosedOrders");

let currentSession = null;
let activeAdminPanel = "orders";

function showDashboardMessage(message, isError = false) {
  dashboardMessage.textContent = message;
  dashboardMessage.className = `rounded-xl border px-4 py-3 text-sm ${isError ? "border-red-300 bg-red-50 text-red-600" : "border-green-300 bg-green-50 text-green-700"}`;
}

function clearDashboardMessage() {
  dashboardMessage.className = "hidden rounded-xl border px-4 py-3 text-sm";
  dashboardMessage.textContent = "";
}

function getStatusPill(status) {
  const map = {
    Pending: "bg-amber-100 text-amber-700",
    Preparing: "bg-orange-100 text-orange-700",
    Ready: "bg-green-100 text-green-700",
    Completed: "bg-slate-200 text-slate-700",
  };

  return `<span class="rounded-full px-3 py-1 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}">${status}</span>`;
}

function updateStats(orders) {
  const pending = orders.filter((order) => order.status === "Pending").length;
  const preparing = orders.filter((order) => order.status === "Preparing").length;
  const readyOrCompleted = orders.filter((order) => ["Ready", "Completed"].includes(order.status)).length;

  statTotalOrders.textContent = String(orders.length);
  statPendingOrders.textContent = String(pending);
  statPreparingOrders.textContent = String(preparing);
  statClosedOrders.textContent = String(readyOrCompleted);
}

function setActiveAdminPanel(panelName) {
  const permissions = currentSession?.permissions || {};
  const nextPanel = panelName === "users" && !permissions.manageUsers ? "orders" : panelName;
  activeAdminPanel = nextPanel;

  adminPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.adminPanel !== nextPanel);
  });

  adminPanelTriggers.forEach((button) => {
    const isActive = button.dataset.adminPanelTrigger === nextPanel;
    button.className = isActive
      ? "admin-panel-trigger rounded-xl bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800"
      : "admin-panel-trigger rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50";
  });
}

function applyRoleView() {
  const permissions = currentSession?.permissions || {};

  usersPanelTrigger.classList.toggle("hidden", !permissions.manageUsers);
  menuCreateForm.classList.add("hidden");
  menuSectionHint.textContent = "Add/remove menu is disabled for now. Admin, staff, and chef can update prices for existing items.";

  if (!permissions.manageUsers && activeAdminPanel === "users") {
    setActiveAdminPanel("orders");
    return;
  }

  setActiveAdminPanel(activeAdminPanel);
}

function renderOrders(orders) {
  if (orders.length === 0) {
    adminOrdersList.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
        No orders yet. Customer orders will appear here once they are submitted.
      </div>
    `;
    return;
  }

  adminOrdersList.innerHTML = orders.map((order) => {
    const items = parseOrderItems(order.items);
    const orderId = order.order_id || order.orderId;

    return `
      <article class="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div class="grid gap-4 md:grid-cols-3 xl:flex-1">
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-400">Order ID</p>
              <p class="mt-1 font-bold text-slate-900">${orderId}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-400">Table</p>
              <p class="mt-1 font-semibold text-slate-900">${order.table_number || order.tableNumber}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-400">Current Status</p>
              <div class="mt-2">${getStatusPill(order.status)}</div>
            </div>
          </div>

          <div class="w-full xl:max-w-xs">
            <label for="status-${orderId}" class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Update Status
            </label>
            <div class="flex gap-2">
              <select id="status-${orderId}" data-order-id="${orderId}" class="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200">
                ${ORDER_STATUSES.map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}
              </select>
              <button data-save-order-id="${orderId}" class="rounded-xl bg-orange-500 px-4 py-3 font-medium text-white transition hover:bg-orange-600">
                Save
              </button>
            </div>
          </div>
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <p class="mb-2 text-xs uppercase tracking-wide text-slate-400">Items</p>
            <div class="grid gap-2 md:grid-cols-2">
              ${items.map((item) => `
                <div class="rounded-xl bg-slate-50 px-4 py-3">
                  <p class="font-medium text-slate-800">${item.name}</p>
                  <p class="mt-1 text-sm text-slate-500">Qty ${item.quantity}</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900">${formatCurrency(item.total)}</p>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="rounded-2xl bg-slate-950 px-5 py-4 text-white">
            <p class="text-xs uppercase tracking-wide text-slate-400">Total</p>
            <p class="mt-2 text-2xl font-black">${formatCurrency(order.total_price || order.totalPrice)}</p>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderMenuItems(items) {
  if (items.length === 0) {
    menuManagementList.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
        No menu items found.
      </div>
    `;
    return;
  }

  menuManagementList.innerHTML = items.map((item) => `
    <article class="rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-4">
          <img src="${item.image}" alt="${item.name}" class="h-16 w-16 rounded-2xl object-cover">
          <div>
            <p class="font-semibold text-slate-900">${item.name}</p>
            <p class="text-sm capitalize text-slate-500">${item.category}</p>
          </div>
        </div>

        <div class="flex flex-col gap-3 md:flex-row md:items-center">
          <input data-price-id="${item.id}" type="number" min="0" value="${item.price}" class="rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200">
          <button data-save-price-id="${item.id}" class="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800">
            Save Price
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

function renderUsers(users) {
  if (!currentSession?.permissions?.manageUsers) {
    userManagementList.innerHTML = "";
    return;
  }

  if (users.length === 0) {
    userManagementList.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
        No staff accounts yet.
      </div>
    `;
    return;
  }

  userManagementList.innerHTML = users.map((user) => `
    <article class="rounded-2xl border border-slate-200 p-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="font-semibold text-slate-900">${user.fullName || user.username}</p>
          <p class="text-sm text-slate-500">@${user.username}</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold uppercase tracking-wide text-orange-600">${user.role}</p>
          <p class="text-xs text-slate-400">${user.isActive ? "Active" : "Inactive"}</p>
        </div>
      </div>
    </article>
  `).join("");
}

async function ensureAdminSession() {
  const response = await apiFetch("/admin/session", {
    method: "GET",
  });

  if (!response.ok) {
    window.location.href = `${API_BASE_URL}/admin-login`;
    return null;
  }

  const data = await readJsonResponse(response);
  currentSession = data;
  applyRoleView();
  adminGreeting.textContent = `Signed in as ${data.user.fullName || data.user.username} (${data.user.role}).`;
  return data;
}

async function loadOrders() {
  const response = await apiFetch("/admin/orders", {
    method: "GET",
  });

  if (response.status === 401) {
    window.location.href = `${API_BASE_URL}/admin-login`;
    return [];
  }

  if (!response.ok) {
    throw new Error("Failed to load orders.");
  }

  const orders = await readJsonResponse(response);
  updateStats(orders);
  renderOrders(orders);
  return orders;
}

async function loadMenuManagement() {
  const response = await apiFetch("/admin/menu", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to load menu items.");
  }

  const items = await readJsonResponse(response);
  renderMenuItems(items);
  return items;
}

async function loadUsers() {
  if (!currentSession?.permissions?.manageUsers) {
    return [];
  }

  const response = await apiFetch("/admin/users", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to load users.");
  }

  const users = await readJsonResponse(response);
  renderUsers(users);
  return users;
}

async function refreshDashboard() {
  clearDashboardMessage();
  refreshOrdersBtn.disabled = true;
  refreshOrdersBtn.textContent = "Refreshing...";

  try {
    await Promise.all([
      loadOrders(),
      loadMenuManagement(),
      loadUsers(),
    ]);
  } catch (error) {
    console.error(error);
    showDashboardMessage(error.message || "Failed to refresh dashboard.", true);
  } finally {
    refreshOrdersBtn.disabled = false;
    refreshOrdersBtn.textContent = "Refresh Orders";
  }
}

adminOrdersList.addEventListener("click", async (event) => {
  const orderId = event.target.dataset.saveOrderId;

  if (!orderId) {
    return;
  }

  const selectElement = document.getElementById(`status-${orderId}`);
  const originalText = event.target.textContent;

  event.target.disabled = true;
  event.target.textContent = "Saving...";

  try {
    const response = await apiFetch(`/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: selectElement.value }),
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to update status.");
    }

    showDashboardMessage(`Order ${orderId} updated to ${data.status}.`);
    await refreshDashboard();
  } catch (error) {
    console.error(error);
    showDashboardMessage(error.message || "Failed to update status.", true);
  } finally {
    event.target.disabled = false;
    event.target.textContent = originalText;
  }
});

menuManagementList.addEventListener("click", async (event) => {
  const savePriceId = event.target.dataset.savePriceId;

  if (!savePriceId) {
    return;
  }

  const originalText = event.target.textContent;
  event.target.disabled = true;
  event.target.textContent = "Saving...";

  try {
    const input = document.querySelector(`[data-price-id="${savePriceId}"]`);
    const response = await apiFetch(`/admin/menu/${savePriceId}/price`, {
      method: "PATCH",
      body: JSON.stringify({ price: Number(input.value) }),
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || "Menu update failed.");
    }

    showDashboardMessage("Menu price updated.");
    await refreshDashboard();
  } catch (error) {
    console.error(error);
    showDashboardMessage(error.message || "Menu update failed.", true);
  } finally {
    event.target.disabled = false;
    event.target.textContent = originalText;
  }
});

menuCreateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showDashboardMessage("Adding or removing menu items is disabled for now.", true);
});

createUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(createUserForm);
  createUserButton.disabled = true;
  createUserButton.textContent = "Creating...";

  try {
    const response = await apiFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify({
        username: String(formData.get("username") || "").trim(),
        fullName: String(formData.get("fullName") || "").trim(),
        password: String(formData.get("password") || ""),
        role: String(formData.get("role") || "staff"),
      }),
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to create user.");
    }

    createUserForm.reset();
    showDashboardMessage(`Created ${data.role} account for ${data.username}.`);
    await refreshDashboard();
  } catch (error) {
    console.error(error);
    showDashboardMessage(error.message || "Failed to create user.", true);
  } finally {
    createUserButton.disabled = false;
    createUserButton.textContent = "Create User";
  }
});

refreshOrdersBtn.addEventListener("click", refreshDashboard);

adminPanelTriggers.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveAdminPanel(button.dataset.adminPanelTrigger);
    clearDashboardMessage();
  });
});

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;
  logoutBtn.textContent = "Logging Out...";

  try {
    await apiFetch("/admin/logout", {
      method: "POST",
    });
  } catch (error) {
    console.error(error);
  } finally {
    window.location.href = "/admin-login";
  }
});

(async () => {
  try {
    const session = await ensureAdminSession();
    if (!session) {
      return;
    }

    await refreshDashboard();
  } catch (error) {
    console.error(error);
    window.location.href = `${API_BASE_URL}/admin-login`;
  }
})();
