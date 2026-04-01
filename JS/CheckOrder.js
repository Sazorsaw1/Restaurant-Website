function getStatusBadge(status) {
  const base = "px-2 py-1 rounded text-white text-xs font-semibold";

  switch (status) {
    case "Pending":
      return `<span class="${base} bg-yellow-500">Pending</span>`;
    case "Preparing":
      return `<span class="${base} bg-blue-500">Preparing</span>`;
    case "Ready":
      return `<span class="${base} bg-green-500">Ready</span>`;
    case "Completed":
      return `<span class="${base} bg-gray-600">Completed</span>`;
    default:
      return `<span class="${base} bg-gray-400">${status}</span>`;
  }
}

const checkModal = document.getElementById("checkModal");
const openCheckBtn = document.getElementById("openCheckModal");
const closeCheckBtn = document.getElementById("closeCheckModal");
const checkOrderBtn = document.getElementById("checkOrderBtn");
const orderResult = document.getElementById("orderResult");

// Open modal
openCheckBtn.addEventListener("click", () => {
  // Reset input
  document.getElementById("orderIdInput").value = "";

  // Clear previous result
  orderResult.innerHTML = "";

  // Open modal
  checkModal.classList.remove("hidden");
  checkModal.classList.add("flex");
});

// Close modal
closeCheckBtn.addEventListener("click", () => {
  checkModal.classList.add("hidden");
  checkModal.classList.remove("flex");
});

// Close outside
checkModal.addEventListener("click", (e) => {
  if (e.target === checkModal) {
    checkModal.classList.add("hidden");
    checkModal.classList.remove("flex");
  }
});

// Check order
checkOrderBtn.addEventListener("click", async () => {
const input = document.getElementById("orderIdInput").value.trim();

if (!input) {
    alert("Please enter an Order ID");
    return;
}

const orderId = "ORD-" + input;

  if (!orderId) {
    alert("Please enter an Order ID");
    return;
  }
// Check Order API
  const response = await fetch(`http://localhost:3000/orders/${orderId}`);

if (!response.ok) {
  orderResult.innerHTML = `<p class="text-red-500">Order not found</p>`;
  return;
}

const order = await response.json();

  if (!order) {
    orderResult.innerHTML = `<p class="text-red-500">Order not found</p>`;
    return;
  }

  // Render result
  let itemsHTML = "";
  order.items.forEach(item => {
    itemsHTML += `
      <div class="flex justify-between">
        <span>${item.name} x${item.quantity}</span>
        <span>Rp ${item.total.toLocaleString()}</span>
      </div>
    `;
  });

orderResult.innerHTML = `
  <div class="space-y-3">

    <div class="flex justify-between items-center">
      <div>
        <p class="text-sm text-gray-500">Order ID</p>
        <p class="font-semibold">${order.order_id}</p>
      </div>
      ${getStatusBadge(order.status)}
    </div>

    <div>
      <p class="text-sm text-gray-500">Table</p>
      <p class="font-semibold">${order.table_number}</p>
    </div>

    <div>
      <p class="text-sm text-gray-500 mb-1">Items</p>
      <div class="space-y-1">
        ${order.items.map(item => `
          <div class="flex justify-between text-sm">
            <span>${item.name} x${item.quantity}</span>
            <span>Rp ${item.total.toLocaleString()}</span>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="border-t pt-2 flex justify-between font-bold">
      <span>Total</span>
      <span>Rp ${order.total_price.toLocaleString()}</span>
    </div>

  </div>
`;
});