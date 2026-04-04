const menu = [
  {
    name: "Fried Rice",
    price: 25000,
    category: "food",
    image: "Assets/images/Fried-Rice.jpg"
  },
  {
    name: "Chicken Satay",
    price: 30000,
    category: "food",
    image: "Assets/images/Satay.jpg"
  },
  {
    name: "Iced Tea",
    price: 10000,
    category: "drink",
    image: "Assets/images/Iced-Tea.jpg"
  },
  {
    name: "Chocolate Cake",
    price: 20000,
    category: "dessert",
    image: "Assets/images/cake.jpg"
  }
];

const menuContainer = document.getElementById("menuContainer");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

function renderMenu(items) {
  if (items.length === 0) {
    menuContainer.innerHTML = `
      <div class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        No menu items match your search.
      </div>
    `;
    return;
  }

  menuContainer.innerHTML = items.map((item) => `
    <article class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-amber-100 transition hover:-translate-y-1 hover:shadow-lg">
      <img src="${item.image}" alt="${item.name}" class="h-48 w-full object-cover">
      <div class="p-5">
        <div class="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900">${item.name}</h2>
            <p class="mt-1 text-sm capitalize text-slate-500">${item.category}</p>
          </div>
          <span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
            ${item.category}
          </span>
        </div>
        <p class="text-lg font-bold text-orange-600">${formatCurrency(item.price)}</p>
      </div>
    </article>
  `).join("");
}

function filterMenu() {
  const searchValue = searchInput.value.toLowerCase();
  const selectedCategory = categoryFilter.value;

  const filtered = menu.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchValue);
    const matchCategory = !selectedCategory || item.category === selectedCategory;

    return matchSearch && matchCategory;
  });

  renderMenu(filtered);
}

// Event listeners
searchInput.addEventListener("input", filterMenu);
categoryFilter.addEventListener("change", filterMenu);

// Initial render
renderMenu(menu);
