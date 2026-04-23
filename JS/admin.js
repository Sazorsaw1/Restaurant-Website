const ORDER_STATUSES = ["Pending", "Preparing", "Ready", "Completed"];

const adminGreeting = document.getElementById("adminGreeting");
const dashboardMessage = document.getElementById("dashboardMessage");
const adminOrdersList = document.getElementById("adminOrdersList");
const votesPanelTrigger = document.getElementById("votesPanelTrigger");
const staffPickSummary = document.getElementById("staffPickSummary");
const staffPickVotingList = document.getElementById("staffPickVotingList");
const staffPickVotingHint = document.getElementById("staffPickVotingHint");
const orderViewTabs = document.getElementById("orderViewTabs");
const orderStatusFilters = document.getElementById("orderStatusFilters");
const orderPanelDescription = document.getElementById("orderPanelDescription");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const refreshOrdersBtn = document.getElementById("refreshOrdersBtn");
const logoutBtn = document.getElementById("logoutBtn");
const menuSectionHint = document.getElementById("menuSectionHint");
const menuPanelTrigger = document.getElementById("menuPanelTrigger");
const menuCreateForm = document.getElementById("menuCreateForm");
const menuCreateButton = document.getElementById("menuCreateButton");
const openMenuCreateModalBtn = document.getElementById("openMenuCreateModal");
const closeMenuCreateModalBtn = document.getElementById("closeMenuCreateModal");
const menuCreateModal = document.getElementById("menuCreateModal");
const menuManagementList = document.getElementById("menuManagementList");
const usersPanelTrigger = document.getElementById("usersPanelTrigger");
const userManagementList = document.getElementById("userManagementList");
const createUserForm = document.getElementById("createUserForm");
const createUserButton = document.getElementById("createUserButton");
const sidebarSessionRole = document.getElementById("sidebarSessionRole");
const adminPanelTriggers = Array.from(document.querySelectorAll("[data-admin-panel-trigger]"));
const adminPanels = Array.from(document.querySelectorAll("[data-admin-panel]"));

const statTotalOrders = document.getElementById("statTotalOrders");
const statPendingOrders = document.getElementById("statPendingOrders");
const statPreparingOrders = document.getElementById("statPreparingOrders");
const statReadyOrders = document.getElementById("statReadyOrders");
const statCompletedOrders = document.getElementById("statCompletedOrders");
const THEME_STORAGE_KEY = "admin-theme-preference";
const MENU_CATEGORIES = [
  { value: "main-course", label: "Main Course" },
  { value: "snack", label: "Snack" },
  { value: "beverages", label: "Beverages" },
  { value: "dessert", label: "Dessert" },
];

let currentSession = null;
let activeAdminPanel = "overview";
let activeTheme = "light";
let allOrders = [];
let activeOrderView = "active";
let activeOrderFilter = "all";
let staffPickData = null;

function getInitialTheme() {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function applyTheme(theme) {
  activeTheme = theme === "dark" ? "dark" : "light";
  const isDark = activeTheme === "dark";
  document.body.classList.toggle("admin-night-mode", isDark);
  themeToggleBtn.textContent = isDark ? "Light Mode" : "Night Mode";
  themeToggleBtn.setAttribute("aria-pressed", String(isDark));
}

function toggleTheme() {
  applyTheme(activeTheme === "dark" ? "light" : "dark");
  window.localStorage.setItem(THEME_STORAGE_KEY, activeTheme);
}

function setPanelTriggerButtonState(button, isActive) {
  button.classList.toggle("bg-white/15", !isActive);
  button.classList.toggle("text-white", !isActive);
  button.classList.toggle("hover:bg-white/20", !isActive);
  button.classList.toggle("bg-white", isActive);
  button.classList.toggle("text-slate-900", isActive);
  button.classList.toggle("shadow-sm", isActive);
  button.classList.toggle("border-white", isActive);
  button.classList.toggle("hover:bg-white", isActive);

  button.classList.toggle("border", !isActive);
  button.classList.toggle("border-white/15", !isActive);
  button.classList.toggle("bg-transparent", !isActive);
  button.classList.toggle("text-slate-200", !isActive);
  button.classList.toggle("hover:bg-white/10", !isActive);

  if (isActive) {
    button.classList.remove("bg-transparent", "text-slate-200", "hover:bg-white/10");
  } else {
    button.classList.remove("bg-white", "text-slate-900", "shadow-sm", "border-white", "hover:bg-white");
  }
}

function getMenuCategoryOptions(selectedCategory) {
  return MENU_CATEGORIES.map((category) => `
    <option value="${category.value}" ${category.value === selectedCategory ? "selected" : ""}>${category.label}</option>
  `).join("");
}

function formatCategoryLabel(category) {
  return MENU_CATEGORIES.find((entry) => entry.value === category)?.label || category;
}

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
  const ready = orders.filter((order) => order.status === "Ready").length;
  const completed = orders.filter((order) => order.status === "Completed").length;

  statTotalOrders.textContent = String(orders.length);
  statPendingOrders.textContent = String(pending);
  statPreparingOrders.textContent = String(preparing);
  statReadyOrders.textContent = String(ready);
  statCompletedOrders.textContent = String(completed);
}

function formatDateTime(value) {
  if (!value) {
    return "Not recorded";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not recorded";
  }

  return parsed.toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOrderTimestamp(order, keys) {
  for (const key of keys) {
    const rawValue = order[key];
    if (!rawValue) {
      continue;
    }

    const parsed = new Date(rawValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }

  return 0;
}

function setOrderViewTabStyles() {
  Array.from(orderViewTabs.querySelectorAll("[data-order-view]")).forEach((button) => {
    const isActive = button.dataset.orderView === activeOrderView;
    button.classList.toggle("bg-slate-900", isActive);
    button.classList.toggle("text-white", isActive);
    button.classList.toggle("hover:bg-slate-800", isActive);
    button.classList.toggle("border", !isActive);
    button.classList.toggle("border-slate-300", !isActive);
    button.classList.toggle("text-slate-700", !isActive);
    button.classList.toggle("hover:bg-slate-50", !isActive);
  });
}

function setOrderFilterStyles() {
  Array.from(orderStatusFilters.querySelectorAll("[data-order-filter]")).forEach((button) => {
    const isActive = button.dataset.orderFilter === activeOrderFilter;
    button.classList.toggle("bg-orange-500", isActive);
    button.classList.toggle("text-white", isActive);
    button.classList.toggle("hover:bg-orange-600", isActive);
    button.classList.toggle("border", !isActive);
    button.classList.toggle("border-slate-300", !isActive);
    button.classList.toggle("text-slate-600", !isActive);
    button.classList.toggle("hover:bg-slate-50", !isActive);
  });
}

function getVisibleOrders() {
  const completedOrders = allOrders
    .filter((order) => order.status === "Completed")
    .sort((left, right) => getOrderTimestamp(right, ["completedAt", "completed_at", "createdAt", "created_at"]) - getOrderTimestamp(left, ["completedAt", "completed_at", "createdAt", "created_at"]));

  if (activeOrderView === "completed") {
    return completedOrders;
  }

  const activeOrders = allOrders
    .filter((order) => order.status !== "Completed")
    .sort((left, right) => getOrderTimestamp(left, ["createdAt", "created_at", "completedAt", "completed_at"]) - getOrderTimestamp(right, ["createdAt", "created_at", "completedAt", "completed_at"]));

  switch (activeOrderFilter) {
    case "Pending":
    case "Preparing":
    case "Ready":
      return activeOrders.filter((order) => order.status === activeOrderFilter);
    case "followup":
      return activeOrders.filter((order) => order.requires_staff_followup || order.requiresStaffFollowup);
    default:
      return activeOrders;
  }
}

function updateOrderPanelState() {
  orderPanelDescription.textContent = activeOrderView === "completed"
    ? "Review completed orders here. If one was completed by mistake, you can still move it back into the active queue."
    : "Track the live queue, filter by status, and update orders as they move through service.";
  orderStatusFilters.classList.toggle("hidden", activeOrderView === "completed");
  setOrderViewTabStyles();
  setOrderFilterStyles();
}

function renderStaffPickVoting(data) {
  staffPickData = data;

  if (!data || !Array.isArray(data.items) || data.items.length === 0) {
    staffPickSummary.innerHTML = `
      <article class="admin-card rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:col-span-2 xl:col-span-4">
        <p class="text-sm text-slate-500">No active menu items are available for voting right now.</p>
      </article>
    `;
    staffPickVotingList.innerHTML = "";
    return;
  }

  const topPicks = data.items.filter((item) => item.voteCount > 0).slice(0, 3);
  staffPickSummary.innerHTML = `
    <article class="admin-card rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p class="text-sm font-semibold uppercase tracking-wide text-slate-400">Your Active Votes</p>
      <p class="mt-3 text-3xl font-black text-slate-900">${data.currentUserVoteCount}</p>
      <p class="mt-2 text-sm text-slate-500">You can keep up to ${data.voteLimit} live votes at a time.</p>
    </article>
    <article class="admin-card rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p class="text-sm font-semibold uppercase tracking-wide text-slate-400">Current #1 Pick</p>
      <p class="mt-3 text-xl font-black text-slate-900">${topPicks[0]?.name || "No votes yet"}</p>
      <p class="mt-2 text-sm text-slate-500">${topPicks[0] ? `${topPicks[0].voteCount} staff vote(s)` : "Cast the first vote to start the board."}</p>
    </article>
    <article class="admin-card rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:col-span-2">
      <p class="text-sm font-semibold uppercase tracking-wide text-slate-400">Current Chef's Pick Board</p>
      <div class="mt-3 flex flex-wrap gap-2">
        ${topPicks.length > 0
          ? topPicks.map((item, index) => `
            <span class="rounded-full bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-700">
              #${index + 1} ${item.name} (${item.voteCount})
            </span>
          `).join("")
          : `<span class="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">No ranked picks yet</span>`}
      </div>
    </article>
  `;

  staffPickVotingList.innerHTML = data.items.map((item) => `
    <article class="admin-card rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-4">
          <img src="${item.image}" alt="${item.name}" class="h-16 w-16 rounded-2xl object-cover">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-slate-900">${item.name}</p>
              <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">${formatCategoryLabel(item.category)}</span>
              ${item.voteCount > 0 ? `<span class="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">${item.voteCount} vote(s)</span>` : ""}
              ${item.votedByCurrentUser ? `<span class="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Your vote</span>` : ""}
            </div>
            <p class="mt-1 text-sm text-slate-500">${formatCurrency(item.price)}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            data-staff-pick-action="${item.votedByCurrentUser ? "remove" : "add"}"
            data-staff-pick-id="${item.id}"
            class="rounded-xl px-4 py-2 font-medium text-white transition ${item.votedByCurrentUser ? "bg-slate-700 hover:bg-slate-800" : "bg-orange-500 hover:bg-orange-600"}"
          >
            ${item.votedByCurrentUser ? "Remove Vote" : "Vote for Chef's Pick"}
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

function setActiveAdminPanel(panelName) {
  const permissions = currentSession?.permissions || {};
  const nextPanel = panelName === "users" && !permissions.manageUsers
    ? "orders"
    : panelName === "menu" && !permissions.manageMenuCatalog
      ? "orders"
      : panelName;
  activeAdminPanel = nextPanel;

  adminPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.adminPanel !== nextPanel);
  });

  adminPanelTriggers.forEach((button) => {
    setPanelTriggerButtonState(button, button.dataset.adminPanelTrigger === nextPanel);
  });
}

function applyRoleView() {
  const permissions = currentSession?.permissions || {};

  votesPanelTrigger.classList.toggle("hidden", !permissions.voteStaffPicks);
  menuPanelTrigger.classList.toggle("hidden", !permissions.manageMenuCatalog);
  usersPanelTrigger.classList.toggle("hidden", !permissions.manageUsers);
  openMenuCreateModalBtn.classList.toggle("hidden", !permissions.manageMenuCatalog);
  sidebarSessionRole.textContent = permissions.manageUsers
    ? "Admin session"
    : permissions.manageMenuCatalog
      ? "Chef session"
      : "Staff session";
  menuSectionHint.textContent = permissions.manageMenuCatalog
    ? "Chef and admin can add menu items with an image path or URL. Removing uses archive/restore so items can be safely brought back later."
    : "Menu management is limited to chef and admin accounts.";

  if ((!permissions.voteStaffPicks && activeAdminPanel === "votes")
    || (!permissions.manageUsers && activeAdminPanel === "users")
    || (!permissions.manageMenuCatalog && activeAdminPanel === "menu")) {
    setActiveAdminPanel("overview");
    return;
  }

  setActiveAdminPanel(activeAdminPanel);
}

function openMenuCreateModal() {
  menuCreateForm.reset();
  toggleModal(menuCreateModal, true);
}

function closeMenuCreateModal() {
  toggleModal(menuCreateModal, false);
}

function renderOrders(orders) {
  if (orders.length === 0) {
    adminOrdersList.innerHTML = `
      <div class="admin-empty-state rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
        ${activeOrderView === "completed"
          ? "No completed orders yet. Finished orders will appear here once they are marked completed."
          : "No active orders right now. New customer orders will appear here once they are submitted."}
      </div>
    `;
    return;
  }

  adminOrdersList.innerHTML = orders.map((order) => {
    const items = parseOrderItems(order.items);
    const orderId = order.order_id || order.orderId;

    return `
      <article class="admin-card rounded-2xl border border-slate-200 p-5 shadow-sm">
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
          ${order.requires_staff_followup || order.requiresStaffFollowup ? `
            <div class="mb-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
              Large or detailed order: a staff member should go to this table for specifications.
            </div>
          ` : ""}
          <label for="status-${orderId}" class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Update Status
          </label>
            <div class="flex gap-2">
              <select id="status-${orderId}" data-order-id="${orderId}" class="admin-input flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200">
                ${ORDER_STATUSES.map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}
              </select>
              <button data-save-order-id="${orderId}" class="rounded-xl bg-orange-500 px-4 py-3 font-medium text-white transition hover:bg-orange-600">
                Save
              </button>
            </div>
            ${order.status === "Completed" ? `
              <p class="mt-2 text-xs text-slate-400">
                Completed at ${formatDateTime(order.completedAt)}.
              </p>
            ` : ""}
          </div>
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <p class="mb-2 text-xs uppercase tracking-wide text-slate-400">Items</p>
            <div class="grid gap-2 md:grid-cols-2">
              ${items.map((item) => `
                <div class="admin-soft-card rounded-xl bg-slate-50 px-4 py-3">
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
      <div class="admin-empty-state rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
        No menu items found.
      </div>
    `;
    return;
  }

  const canManageCatalog = Boolean(currentSession?.permissions?.manageMenuCatalog);
  menuManagementList.innerHTML = items.map((item) => `
    <article class="admin-card rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-4">
          <img src="${item.image}" alt="${item.name}" class="h-16 w-16 rounded-2xl object-cover">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-slate-900">${item.name}</p>
              <span class="rounded-full px-2 py-1 text-xs font-semibold ${item.isAvailable ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}">
                ${item.isAvailable ? "Active" : "Archived"}
              </span>
            </div>
            <p class="text-sm text-slate-500">${formatCategoryLabel(item.category)}</p>
            <p class="text-xs text-slate-400">${item.image}</p>
          </div>
        </div>

        <div class="flex flex-col gap-3 md:flex-row md:items-center">
          <select data-category-id="${item.id}" class="admin-input rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200">
            ${getMenuCategoryOptions(item.category)}
          </select>
          <input data-price-id="${item.id}" type="number" min="0" value="${item.price}" class="admin-input rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200">
          <button data-save-menu-id="${item.id}" class="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800">
            Save Details
          </button>
          ${canManageCatalog ? `
            <button data-toggle-availability-id="${item.id}" data-next-availability="${item.isAvailable ? "false" : "true"}" class="rounded-xl px-4 py-2 font-medium text-white transition ${item.isAvailable ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}">
              ${item.isAvailable ? "Archive Item" : "Restore Item"}
            </button>
          ` : ""}
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
      <div class="admin-empty-state rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
        No staff accounts yet.
      </div>
    `;
    return;
  }

  userManagementList.innerHTML = users.map((user) => {
    const isSelf = Number(user.id) === Number(currentSession?.user?.id);
    const helperText = isSelf
      ? "Your account cannot delete itself or change its own role."
      : normalizeRoleLabel(user.role) === "admin"
        ? "Admin accounts can only be changed by another admin."
        : "You can update this user's role or remove the account.";

    return `
    <article class="admin-card rounded-2xl border border-slate-200 p-4">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="font-semibold text-slate-900">${user.fullName || user.username}</p>
          <p class="text-sm text-slate-500">@${user.username}</p>
          <p class="mt-2 text-xs text-slate-400">${helperText}</p>
        </div>
        <div class="flex flex-col gap-3 md:flex-row md:items-center">
          <select data-user-role-id="${user.id}" class="admin-input rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200" ${isSelf ? "disabled" : ""}>
            <option value="staff" ${user.role === "staff" ? "selected" : ""}>Staff</option>
            <option value="chef" ${user.role === "chef" ? "selected" : ""}>Chef</option>
            <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
          <button data-save-user-id="${user.id}" class="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300" ${isSelf ? "disabled" : ""}>
            Save Role
          </button>
          <button data-delete-user-id="${user.id}" class="rounded-xl bg-red-500 px-4 py-2 font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-200" ${isSelf ? "disabled" : ""}>
            Remove User
          </button>
          <div class="text-right">
            <p class="text-sm font-semibold uppercase tracking-wide text-orange-600">${user.role}</p>
            <p class="text-xs text-slate-400">${user.isActive ? "Active" : "Inactive"}</p>
          </div>
        </div>
      </div>
    </article>
  `;
  }).join("");
}

function normalizeRoleLabel(role) {
  return String(role || "").trim().toLowerCase();
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
  allOrders = Array.isArray(orders) ? orders : [];
  updateStats(orders);
  updateOrderPanelState();
  renderOrders(getVisibleOrders());
  return allOrders;
}

async function loadMenuManagement() {
  if (!currentSession?.permissions?.manageMenuCatalog) {
    menuManagementList.innerHTML = "";
    return [];
  }

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

async function loadStaffPickVoting() {
  if (!currentSession?.permissions?.voteStaffPicks) {
    staffPickSummary.innerHTML = "";
    staffPickVotingList.innerHTML = "";
    return null;
  }

  const response = await apiFetch("/admin/staff-picks", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to load Chef's Pick voting.");
  }

  const data = await readJsonResponse(response);
  renderStaffPickVoting(data);
  return data;
}

async function refreshDashboard() {
  clearDashboardMessage();
  refreshOrdersBtn.disabled = true;
  refreshOrdersBtn.textContent = "Refreshing...";

  try {
    await Promise.all([
      loadOrders(),
      loadStaffPickVoting(),
      currentSession?.permissions?.manageMenuCatalog ? loadMenuManagement() : Promise.resolve([]),
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

staffPickVotingList.addEventListener("click", async (event) => {
  const action = event.target.dataset.staffPickAction;
  const menuItemId = event.target.dataset.staffPickId;

  if (!action || !menuItemId) {
    return;
  }

  const originalText = event.target.textContent;
  event.target.disabled = true;
  event.target.textContent = action === "add" ? "Voting..." : "Removing...";

  try {
    const response = await apiFetch(`/admin/staff-picks/${menuItemId}`, {
      method: action === "add" ? "POST" : "DELETE",
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to update Chef's Pick vote.");
    }

    renderStaffPickVoting(data);
    showDashboardMessage(action === "add" ? "Chef's Pick vote added." : "Chef's Pick vote removed.");
  } catch (error) {
    console.error(error);
    showDashboardMessage(error.message || "Failed to update Chef's Pick vote.", true);
  } finally {
    event.target.disabled = false;
    event.target.textContent = originalText;
  }
});

orderViewTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-order-view]");
  if (!button) {
    return;
  }

  activeOrderView = button.dataset.orderView;
  updateOrderPanelState();
  renderOrders(getVisibleOrders());
});

orderStatusFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-order-filter]");
  if (!button) {
    return;
  }

  activeOrderFilter = button.dataset.orderFilter;
  updateOrderPanelState();
  renderOrders(getVisibleOrders());
});

menuManagementList.addEventListener("click", async (event) => {
  const saveMenuId = event.target.dataset.saveMenuId;
  const toggleAvailabilityId = event.target.dataset.toggleAvailabilityId;

  if (!saveMenuId && !toggleAvailabilityId) {
    return;
  }

  const originalText = event.target.textContent;
  event.target.disabled = true;
  event.target.textContent = saveMenuId ? "Saving..." : "Updating...";

  try {
    let response;

    if (saveMenuId) {
      const priceInput = document.querySelector(`[data-price-id="${saveMenuId}"]`);
      const categorySelect = document.querySelector(`[data-category-id="${saveMenuId}"]`);
      response = await apiFetch(`/admin/menu/${saveMenuId}`, {
        method: "PATCH",
        body: JSON.stringify({
          price: Number(priceInput.value),
          category: categorySelect.value,
        }),
      });
    } else {
      response = await apiFetch(`/admin/menu/${toggleAvailabilityId}/availability`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: event.target.dataset.nextAvailability === "true" }),
      });
    }

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || "Menu update failed.");
    }

    showDashboardMessage(saveMenuId ? "Menu details updated." : `Menu item ${data.isAvailable ? "restored" : "archived"}.`);
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
  const formData = new FormData(menuCreateForm);
  menuCreateButton.disabled = true;
  menuCreateButton.textContent = "Adding...";

  try {
    const response = await apiFetch("/admin/menu", {
      method: "POST",
      body: JSON.stringify({
        name: String(formData.get("name") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        price: Number(formData.get("price")),
        image: String(formData.get("image") || "").trim(),
      }),
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to add menu item.");
    }

    menuCreateForm.reset();
    closeMenuCreateModal();
    showDashboardMessage(`Added menu item ${data.name}.`);
    await refreshDashboard();
  } catch (error) {
    console.error(error);
    showDashboardMessage(error.message || "Failed to add menu item.", true);
  } finally {
    menuCreateButton.disabled = false;
    menuCreateButton.textContent = "Add Menu Item";
  }
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

userManagementList.addEventListener("click", async (event) => {
  const saveUserId = event.target.dataset.saveUserId;
  const deleteUserId = event.target.dataset.deleteUserId;

  if (!saveUserId && !deleteUserId) {
    return;
  }

  if (deleteUserId && !window.confirm("Remove this user account? This cannot be undone.")) {
    return;
  }

  const originalText = event.target.textContent;
  event.target.disabled = true;
  event.target.textContent = saveUserId ? "Saving..." : "Removing...";

  try {
    let response;

    if (saveUserId) {
      const roleSelect = document.querySelector(`[data-user-role-id="${saveUserId}"]`);
      response = await apiFetch(`/admin/users/${saveUserId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: roleSelect.value }),
      });
    } else {
      response = await apiFetch(`/admin/users/${deleteUserId}`, {
        method: "DELETE",
      });
    }

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to update the user.");
    }

    showDashboardMessage(saveUserId ? "User role updated." : "User removed.");
    await refreshDashboard();
  } catch (error) {
    console.error(error);
    showDashboardMessage(error.message || "Failed to update the user.", true);
  } finally {
    event.target.disabled = false;
    event.target.textContent = originalText;
  }
});

refreshOrdersBtn.addEventListener("click", refreshDashboard);
themeToggleBtn.addEventListener("click", toggleTheme);

openMenuCreateModalBtn.addEventListener("click", openMenuCreateModal);
closeMenuCreateModalBtn.addEventListener("click", closeMenuCreateModal);

menuCreateModal.addEventListener("click", (event) => {
  if (event.target === menuCreateModal) {
    closeMenuCreateModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuCreateModal.classList.contains("flex")) {
    closeMenuCreateModal();
  }
});

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
    applyTheme(getInitialTheme());
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

closeMenuCreateModal();
