const LOCAL_MENU_FALLBACK = [
  {
    name: "Fried Rice",
    price: 25000,
    category: "food",
    image: "Assets/images/Fried-Rice.jpg",
  },
  {
    name: "Chicken Satay",
    price: 30000,
    category: "grill",
    image: "Assets/images/Satay.jpg",
  },
  {
    name: "Seafood Noodles",
    price: 29000,
    category: "noodles",
    image: "Assets/images/Fried-Rice.jpg",
  },
  {
    name: "Grilled Gourami",
    price: 48000,
    category: "grill",
    image: "Assets/images/Grilled Gourami.png",
  },
  {
    name: "Chicken Soup",
    price: 22000,
    category: "soup",
    image: "Assets/images/Fried-Rice.jpg",
  },
  {
    name: "Fried Tofu",
    price: 17000,
    category: "snack",
    image: "Assets/images/Fried Tofu.jpg",
  },
  {
    name: "Iced Tea",
    price: 10000,
    category: "tea",
    image: "Assets/images/Iced-Tea.jpg",
  },
  {
    name: "Lemon Tea",
    price: 12000,
    category: "tea",
    image: "Assets/images/Iced-Tea.jpg",
  },
  {
    name: "Iced Americano",
    price: 18000,
    category: "coffee",
    image: "Assets/images/Iced-Tea.jpg",
  },
  {
    name: "Avocado Juice",
    price: 19000,
    category: "juice",
    image: "Assets/images/Avocado Juice.jpg",
  },
  {
    name: "Lychee Cooler",
    price: 17000,
    category: "juice",
    image: "Assets/images/Iced-Tea.jpg",
  },
  {
    name: "Chocolate Cake",
    price: 20000,
    category: "dessert",
    image: "Assets/images/cake.jpg",
  },
  {
    name: "Chocolate Pudding",
    price: 18000,
    category: "dessert",
    image: "Assets/images/Chocolate Pudding.jpg",
  },
  {
    name: "Vanilla Pudding",
    price: 18000,
    category: "dessert",
    image: "Assets/images/Vanilla Pudding.jpg",
  },
];

var menu = [];
const menuContainer = document.getElementById("menuContainer");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

function renderMenuLoadingState(message = "Loading menu...") {
  menuContainer.innerHTML = `
    <div class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
      ${message}
    </div>
  `;
}

function populateCategoryFilter(items) {
  const categories = [...new Set(items.map((item) => item.category))];
  categoryFilter.innerHTML = [
    `<option value="">All Categories</option>`,
    ...categories.map((category) => `<option value="${category}">${category.charAt(0).toUpperCase()}${category.slice(1)}</option>`),
  ].join("");
}

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

searchInput.addEventListener("input", filterMenu);
categoryFilter.addEventListener("change", filterMenu);

async function loadMenu() {
  renderMenuLoadingState();

  try {
    const response = await apiFetch("/menu", {
      method: "GET",
      headers: {},
    });

    if (!response.ok) {
      throw new Error("Failed to load menu.");
    }

    menu = await response.json();
    populateCategoryFilter(menu);
    renderMenu(menu);
    return menu;
  } catch (error) {
    console.error(error);
    menu = [...LOCAL_MENU_FALLBACK];
    populateCategoryFilter(menu);
    renderMenu(menu);
    return menu;
  }
}

window.menuReady = loadMenu();
