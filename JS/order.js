// Get elements
const orderItemsContainer = document.getElementById("orderItems");
const totalPriceEl = document.getElementById("totalPrice");

// Store selected items
let orderState = {};

// Render menu into modal
function renderOrderItems() {
  orderItemsContainer.innerHTML = "";

  menu.forEach(item => {
    orderState[item.name] = {
      ...item,
      quantity: 1,
      selected: false
    };

    const row = document.createElement("div");
    row.className = "flex items-center justify-between mb-2";

    row.innerHTML = `
    <label class="flex-1 truncate">
        <input type="checkbox" data-name="${item.name}">
        ${item.name}
    </label>

      <div class="flex items-center gap-2">
        <button data-action="minus" data-name="${item.name}" class="px-2 bg-gray-200">-</button>
        <span id="qty-${item.name}">1</span>
        <button data-action="plus" data-name="${item.name}" class="px-2 bg-gray-200">+</button>
      </div>
    `;

    orderItemsContainer.appendChild(row);
  });
}

// Update total
function updateTotal() {
  let total = 0;

  Object.values(orderState).forEach(item => {
    if (item.selected) {
      total += item.price * item.quantity;
    }
  });

  totalPriceEl.textContent = total.toLocaleString();
}

// Handle clicks
orderItemsContainer.addEventListener("click", (e) => {
  const name = e.target.dataset.name;
  const action = e.target.dataset.action;

  if (!name) return;

  if (action === "plus") {
    orderState[name].quantity++;
  }

  if (action === "minus" && orderState[name].quantity > 1) {
    orderState[name].quantity--;
  }

  // Update UI
  const qtyEl = document.getElementById(`qty-${name}`);
  if (qtyEl) {
    qtyEl.textContent = orderState[name].quantity;
  }

  updateTotal();
});

// Handle checkbox
orderItemsContainer.addEventListener("change", (e) => {
  if (e.target.type === "checkbox") {
    const name = e.target.dataset.name;
    orderState[name].selected = e.target.checked;
    updateTotal();
  }
});

// Run when modal opens
document.getElementById("openModal").addEventListener("click", () => {
  renderOrderItems();
  updateTotal();
});

// Generate Order ID
function generateOrderId() {
  return "ORD-" + Math.floor(100000 + Math.random() * 900000);
}

// Submit order
document.getElementById("submitOrder").addEventListener("click", () => {
  const tableNumber = document.getElementById("tableNumber").value;

  // Validation
  if (!tableNumber) {
    alert("Please select a table number");
    return;
  }

  const selectedItems = Object.values(orderState).filter(item => item.selected);

  if (selectedItems.length === 0) {
    alert("Please select at least one menu item");
    return;
  }

  const orderId = generateOrderId();

  const orderData = {
    orderId,
    tableNumber,
    items: selectedItems.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      total: item.price * item.quantity
    })),
    totalPrice: selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  // Save to localStorage
  localStorage.setItem(orderId, JSON.stringify(orderData));

  // Show Order ID
  // Show success modal
    const successModal = document.getElementById("successModal");
    const generatedOrderIdEl = document.getElementById("generatedOrderId");

    generatedOrderIdEl.textContent = orderId;

    successModal.classList.remove("hidden");
    successModal.classList.add("flex");

  // Reset modal
  document.getElementById("orderModal").classList.add("hidden");
  document.getElementById("orderModal").classList.remove("flex");
});
const copyBtn = document.getElementById("copyOrderId");

copyBtn.addEventListener("click", () => {
const fullId = document.getElementById("generatedOrderId").textContent;

// Remove "ORD-" prefix
const cleanId = fullId.replace("ORD-", "");

navigator.clipboard.writeText(cleanId);

  copyBtn.textContent = "Copied!";
  setTimeout(() => {
    copyBtn.textContent = "Copy";
  }, 1500);
});
const closeSuccessModal = document.getElementById("closeSuccessModal");

closeSuccessModal.addEventListener("click", () => {
  successModal.classList.add("hidden");
  successModal.classList.remove("flex");
});
document.getElementById("orderModal").classList.add("hidden");
document.getElementById("orderModal").classList.remove("flex");