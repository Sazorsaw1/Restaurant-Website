const orderModal = document.getElementById("orderModal");
const successModal = document.getElementById("successModal");
const orderItemsContainer = document.getElementById("orderItems");
const totalPriceEl = document.getElementById("totalPrice");
const tableNumberSelect = document.getElementById("tableNumber");
const submitOrderButton = document.getElementById("submitOrder");
const generatedOrderIdEl = document.getElementById("generatedOrderId");
const copyBtn = document.getElementById("copyOrderId");
const largeOrderNotice = document.getElementById("largeOrderNotice");

let orderState = {};

function getAutomationSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getQuantityElementId(name) {
  return `qty-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function createInitialOrderState() {
  return menu.reduce((state, item) => {
    state[item.name] = {
      ...item,
      quantity: 1,
      selected: false,
    };

    return state;
  }, {});
}

function renderOrderItems() {
  if (menu.length === 0) {
    orderItemsContainer.innerHTML = `
      <div data-testid="order-items-empty-state" class="rounded-xl bg-white p-4 text-sm text-slate-500">
        No menu items are available right now.
      </div>
    `;
    return;
  }

  orderItemsContainer.innerHTML = menu.map((item) => `
    <div
      data-testid="order-item-${getAutomationSlug(item.name)}"
      data-menu-name="${item.name}"
      class="flex items-center justify-between gap-4 rounded-xl bg-white p-3 shadow-sm"
    >
      <label class="flex min-w-0 flex-1 items-center gap-3">
        <input
          type="checkbox"
          data-name="${item.name}"
          data-testid="order-checkbox-${getAutomationSlug(item.name)}"
          class="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
        >
        <div class="min-w-0">
          <p data-testid="order-item-name-${getAutomationSlug(item.name)}" class="truncate font-medium text-slate-800">${item.name}</p>
          <p data-testid="order-item-price-${getAutomationSlug(item.name)}" class="text-sm text-slate-500">${formatCurrency(item.price)}</p>
        </div>
      </label>

      <div class="flex items-center gap-2">
        <button
          type="button"
          data-action="minus"
          data-name="${item.name}"
          data-testid="decrease-quantity-${getAutomationSlug(item.name)}"
          class="rounded-md bg-slate-200 px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-300"
        >-</button>
        <span id="${getQuantityElementId(item.name)}" data-testid="quantity-value-${getAutomationSlug(item.name)}" class="w-6 text-center font-semibold text-slate-800">1</span>
        <button
          type="button"
          data-action="plus"
          data-name="${item.name}"
          data-testid="increase-quantity-${getAutomationSlug(item.name)}"
          class="rounded-md bg-slate-200 px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-300"
        >+</button>
      </div>
    </div>
  `).join("");
}

function updateTotal() {
  const total = Object.values(orderState).reduce((sum, item) => {
    if (!item.selected) {
      return sum;
    }

    return sum + (item.price * item.quantity);
  }, 0);

  totalPriceEl.textContent = Number(total).toLocaleString("id-ID");
}

function resetOrderForm() {
  tableNumberSelect.value = "";
  orderState = createInitialOrderState();
  renderOrderItems();
  updateTotal();
}

async function openOrderModal() {
  if (window.menuReady) {
    await window.menuReady;
  }

  resetOrderForm();
  toggleModal(orderModal, true);
}

function closeOrderModal() {
  toggleModal(orderModal, false);
}

function openSuccessModal(orderId, shouldShowLargeOrderNotice = false) {
  generatedOrderIdEl.textContent = orderId;
  successModal.dataset.orderId = orderId;
  largeOrderNotice.classList.toggle("hidden", !shouldShowLargeOrderNotice);
  toggleModal(successModal, true);
}

function closeSuccessModal() {
  toggleModal(successModal, false);
}

function generateOrderId() {
  return `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
}

orderItemsContainer.addEventListener("click", (event) => {
  const { name, action } = event.target.dataset;

  if (!name || !action || !orderState[name]) {
    return;
  }

  if (action === "plus") {
    orderState[name].quantity += 1;
  }

  if (action === "minus" && orderState[name].quantity > 1) {
    orderState[name].quantity -= 1;
  }

  const qtyEl = document.getElementById(getQuantityElementId(name));
  if (qtyEl) {
    qtyEl.textContent = orderState[name].quantity;
  }

  updateTotal();
});

orderItemsContainer.addEventListener("change", (event) => {
  if (event.target.type !== "checkbox") {
    return;
  }

  const { name } = event.target.dataset;
  if (!name || !orderState[name]) {
    return;
  }

  orderState[name].selected = event.target.checked;
  updateTotal();
});

document.getElementById("openModal").addEventListener("click", openOrderModal);
document.getElementById("cancelOrder").addEventListener("click", closeOrderModal);
document.getElementById("closeSuccessModal").addEventListener("click", closeSuccessModal);

orderModal.addEventListener("click", (event) => {
  if (event.target === orderModal) {
    closeOrderModal();
  }
});

successModal.addEventListener("click", (event) => {
  if (event.target === successModal) {
    closeSuccessModal();
  }
});

submitOrderButton.addEventListener("click", async () => {
  const tableNumber = tableNumberSelect.value;

  if (!tableNumber) {
    alert("Please select a table number.");
    return;
  }

  const selectedItems = Object.values(orderState).filter((item) => item.selected);

  if (selectedItems.length === 0) {
    alert("Please select at least one menu item.");
    return;
  }

  const orderId = generateOrderId();
  const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const requiresStaffFollowup = selectedItems.some((item) => item.quantity > 20) || totalQuantity > 30;
  const orderData = {
    orderId,
    tableNumber,
    items: selectedItems.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      total: item.price * item.quantity,
    })),
    totalPrice,
    status: "Pending",
    createdAt: new Date().toISOString(),
    requiresStaffFollowup,
  };

  submitOrderButton.disabled = true;
  submitOrderButton.textContent = "Submitting...";

  try {
    const response = await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error("Failed to create order.");
    }

    closeOrderModal();
    openSuccessModal(orderId, requiresStaffFollowup);
  } catch (error) {
    console.error(error);
    alert("The order could not be submitted. Please make sure the backend server is running and try again.");
  } finally {
    submitOrderButton.disabled = false;
    submitOrderButton.textContent = "Submit Order";
  }
});

copyBtn.addEventListener("click", async () => {
  const cleanId = generatedOrderIdEl.textContent.replace("ORD-", "");

  try {
    await navigator.clipboard.writeText(cleanId);
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = "Copy";
    }, 1500);
  } catch (error) {
    console.error(error);
    alert("Copy failed. Please copy the order ID manually.");
  }
});

resetOrderForm();
closeOrderModal();
closeSuccessModal();
