const menu = [
  {
    name: "Fried Rice",
    price: 25000,
    category: "food",
    image: "assets/images/fried-rice.jpg"
  },
  {
    name: "Chicken Satay",
    price: 30000,
    category: "food",
    image: "assets/images/satay.jpg"
  },
  {
    name: "Iced Tea",
    price: 10000,
    category: "drink",
    image: "assets/images/iced-tea.jpg"
  },
  {
    name: "Chocolate Cake",
    price: 20000,
    category: "dessert",
    image: "assets/images/cake.jpg"
  }
];

const menuContainer = document.getElementById("menuContainer");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

function renderMenu(items) {
  menuContainer.innerHTML = "";

  items.forEach(item => {
    const card = `
      <div class="bg-white rounded shadow overflow-hidden">
        <img src="${item.image}" class="w-full h-40 object-cover">
        <div class="p-4">
          <h2 class="font-bold text-lg">${item.name}</h2>
          <p class="text-blue-600 font-semibold mt-2">Rp ${item.price.toLocaleString()}</p>
        </div>
      </div>
    `;
    menuContainer.innerHTML += card;
  });
}

function filterMenu() {
  const searchValue = searchInput.value.toLowerCase();
  const selectedCategory = categoryFilter.value;

  const filtered = menu.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchValue);
    const matchCategory =
      selectedCategory === "all" || item.category === selectedCategory;

    return matchSearch && matchCategory;
  });

  renderMenu(filtered);
}

// Event listeners
searchInput.addEventListener("input", filterMenu);
categoryFilter.addEventListener("change", filterMenu);

// Initial render
renderMenu(menu);