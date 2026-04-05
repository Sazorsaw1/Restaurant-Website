function getStatusBadge(status) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold text-white";

  switch (status) {
    case "Pending":
      return `<span class="${base} bg-amber-500">Pending</span>`;
    case "Preparing":
      return `<span class="${base} bg-orange-500">Preparing</span>`;
    case "Ready":
      return `<span class="${base} bg-green-500">Ready</span>`;
    case "Completed":
      return `<span class="${base} bg-slate-700">Completed</span>`;
    default:
      return `<span class="${base} bg-slate-400">${status}</span>`;
  }
}

const checkModal = document.getElementById("checkModal");
const openCheckBtn = document.getElementById("openCheckModal");
const cancelCheckBtn = document.getElementById("cancelCheckOrder");
const checkOrderBtn = document.getElementById("checkOrderBtn");
const orderIdInput = document.getElementById("orderIdInput");
const orderResult = document.getElementById("orderResult");

function resetCheckOrderState() {
  orderIdInput.value = "";
  orderResult.innerHTML = "";
}

function openCheckModal() {
  resetCheckOrderState();
  toggleModal(checkModal, true);
}

function closeCheckModal() {
  toggleModal(checkModal, false);
}

openCheckBtn.addEventListener("click", openCheckModal);
cancelCheckBtn.addEventListener("click", closeCheckModal);

checkModal.addEventListener("click", (e) => {
  if (e.target === checkModal) {
    closeCheckModal();
  }
});

async function handleCheckOrder() {
  const input = orderIdInput.value.trim();

  if (!input) {
    alert("Please enter an Order ID");
    return;
  }

  if (!/^\d{6}$/.test(input)) {
    alert("Please enter the 6-digit number from your Order ID.");
    return;
  }

  const orderId = `ORD-${input}`;
  orderResult.innerHTML = `<p class="text-slate-500">Checking order...</p>`;
  checkOrderBtn.disabled = true;
  checkOrderBtn.textContent = "Checking...";

  try {
    const response = await apiFetch(`/orders/${orderId}`, {
      method: "GET",
    });

    if (!response.ok) {
      orderResult.innerHTML = `<p class="text-red-500">Order not found.</p>`;
      return;
    }

    const order = await response.json();
    const items = parseOrderItems(order.items);
    const totalPrice = Number(order.total_price ?? order.totalPrice ?? 0);

    if (!order || items.length === 0) {
      orderResult.innerHTML = `<p class="text-red-500">Order data is incomplete.</p>`;
      return;
    }

    orderResult.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Order ID</p>
            <p class="font-semibold text-slate-900">${order.order_id ?? order.orderId}</p>
          </div>
          ${getStatusBadge(order.status)}
        </div>

        <div>
          <p class="text-xs uppercase tracking-wide text-slate-400">Table</p>
          <p class="font-semibold text-slate-900">${order.table_number ?? order.tableNumber}</p>
        </div>

        <div>
          <p class="mb-2 text-xs uppercase tracking-wide text-slate-400">Items</p>
          <div class="space-y-2">
            ${items.map((item) => `
              <div class="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span class="text-slate-700">${item.name} x${item.quantity}</span>
                <span class="font-medium text-slate-900">${formatCurrency(item.total)}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
          <span>Total</span>
          <span>${formatCurrency(totalPrice)}</span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error(error);
    orderResult.innerHTML = `<p class="text-red-500">Unable to reach the backend. Please try again.</p>`;
  } finally {
    checkOrderBtn.disabled = false;
    checkOrderBtn.textContent = "Check";
  }
}

checkOrderBtn.addEventListener("click", handleCheckOrder);

orderIdInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleCheckOrder();
  }
});

closeCheckModal();
