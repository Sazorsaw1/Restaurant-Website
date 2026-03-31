const checkModal = document.getElementById("checkModal");
const openCheckBtn = document.getElementById("openCheckModal");
const closeCheckBtn = document.getElementById("closeCheckModal");
const checkOrderBtn = document.getElementById("checkOrderBtn");
const orderResult = document.getElementById("orderResult");

// Open modal
openCheckBtn.addEventListener("click", () => {
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
checkOrderBtn.addEventListener("click", () => {
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

  const order = JSON.parse(localStorage.getItem(orderId));

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
    <p><strong>Order ID:</strong> ${order.orderId}</p>
    <p><strong>Table:</strong> ${order.tableNumber}</p>
    <p class="mt-2 font-semibold">Items:</p>
    ${itemsHTML}
    <p class="mt-2"><strong>Total:</strong> Rp ${order.totalPrice.toLocaleString()}</p>
    <p class="mt-2"><strong>Status:</strong> ${order.status}</p>
  `;
});