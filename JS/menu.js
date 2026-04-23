const LOCAL_MENU_FALLBACK = [
  { name: "Fried Rice", price: 25000, category: "main-course", image: "Assets/images/Fried-Rice.jpg" },
  { name: "Chicken Satay", price: 30000, category: "main-course", image: "Assets/images/Satay.jpg" },
  { name: "Seafood Noodles", price: 29000, category: "main-course", image: "Assets/images/Seafood Noodles.jpg" },
  { name: "Grilled Gourami", price: 48000, category: "main-course", image: "Assets/images/Grilled Gourami.png" },
  { name: "Chicken Soup", price: 22000, category: "main-course", image: "Assets/images/Chicken Soup.jpg" },
  { name: "Fried Tofu", price: 17000, category: "snack", image: "Assets/images/Fried Tofu.jpg" },
  { name: "Iced Tea", price: 10000, category: "beverages", image: "Assets/images/Iced-Tea.jpg" },
  { name: "Lemon Tea", price: 12000, category: "beverages", image: "Assets/images/Iced Lemon Tea.jpg" },
  { name: "Iced Americano", price: 18000, category: "beverages", image: "Assets/images/Iced Americano.jpg" },
  { name: "Avocado Juice", price: 19000, category: "beverages", image: "Assets/images/Avocado Juice.jpg" },
  { name: "Lychee Cooler", price: 17000, category: "beverages", image: "Assets/images/Iced-Tea.jpg" },
  { name: "Chocolate Cake", price: 20000, category: "dessert", image: "Assets/images/cake.jpg" },
  { name: "Chocolate Pudding", price: 18000, category: "dessert", image: "Assets/images/Chocolate Pudding.jpg" },
  { name: "Vanilla Pudding", price: 18000, category: "dessert", image: "Assets/images/Vanilla Pudding.jpg" },
];

var menu = [];
let menuHighlights = {
  todaysRecommendation: [],
  peoplesFavorites: [],
  chefsPick: [],
  chefsPickIds: [],
};

const menuContainer = document.getElementById("menuContainer");
const todaysRecommendationContainer = document.getElementById("todaysRecommendationContainer");
const peoplesFavoritesContainer = document.getElementById("peoplesFavoritesContainer");
const chefsPickContainer = document.getElementById("chefsPickContainer");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

function getAutomationSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCategoryLabel(category) {
  return String(category || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDailyRecommendationFallback(items, count = 4) {
  return [...items]
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, count);
}

function getChefPickIdSet() {
  return new Set((menuHighlights.chefsPickIds || []).map((id) => Number(id)));
}

function renderGridState(container, message, testId) {
  container.innerHTML = `
    <div data-testid="${testId}" class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
      ${message}
    </div>
  `;
}

function createMenuCard(item, options = {}) {
  const slug = getAutomationSlug(item.name);
  const chefPickIds = getChefPickIdSet();
  const isChefPick = chefPickIds.has(Number(item.id)) || options.forceChefPick === true;
  const metricLabel = options.metricLabel ? `
    <p class="mt-3 text-sm font-semibold text-slate-600">${options.metricLabel}</p>
  ` : "";

  return `
    <article
      data-testid="${options.testIdPrefix || "menu-card"}-${slug}"
      data-menu-name="${item.name}"
      data-menu-category="${item.category}"
      class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-amber-100 transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div class="relative">
        <img
          src="${item.image}"
          alt="${item.name}"
          data-testid="menu-image-${slug}"
          loading="lazy"
          decoding="async"
          class="h-48 w-full object-cover"
        >
        ${options.topLabel ? `
          <span class="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700 shadow-sm">
            ${options.topLabel}
          </span>
        ` : ""}
        ${isChefPick ? `
          <span data-testid="chef-pick-badge-${slug}" class="absolute right-3 top-3 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200 shadow-sm">
            Chef's Pick
          </span>
        ` : ""}
      </div>
      <div class="p-5">
        <div class="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 data-testid="menu-name-${slug}" class="text-xl font-bold text-slate-900">${item.name}</h2>
            <p data-testid="menu-category-${slug}" class="mt-1 text-sm text-slate-500">${formatCategoryLabel(item.category)}</p>
          </div>
          <span data-testid="menu-badge-${slug}" class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
            ${formatCategoryLabel(item.category)}
          </span>
        </div>
        <p data-testid="menu-price-${slug}" class="text-lg font-bold text-orange-600">${formatCurrency(item.price)}</p>
        ${metricLabel}
      </div>
    </article>
  `;
}

function renderHighlightSection(container, items, options) {
  if (!Array.isArray(items) || items.length === 0) {
    renderGridState(container, options.emptyMessage, options.emptyTestId);
    return;
  }

  container.innerHTML = items.map((item) => createMenuCard(item, options.cardOptions(item))).join("");
}

function renderMenuLoadingState(message = "Loading menu...") {
  renderGridState(menuContainer, message, "menu-loading-state");
}

function renderHighlightsLoadingState() {
  renderGridState(todaysRecommendationContainer, "Loading today's recommendations...", "todays-recommendation-loading-state");
  renderGridState(peoplesFavoritesContainer, "Loading people's favorites...", "peoples-favorites-loading-state");
  renderGridState(chefsPickContainer, "Loading Chef's Pick...", "chefs-pick-loading-state");
}

function renderHighlights() {
  renderHighlightSection(todaysRecommendationContainer, menuHighlights.todaysRecommendation, {
    emptyMessage: "Today's recommendations will appear here once the menu is ready.",
    emptyTestId: "todays-recommendation-empty-state",
    cardOptions: () => ({
      topLabel: "Today's Recommendation",
      testIdPrefix: "todays-recommendation-card",
    }),
  });

  renderHighlightSection(peoplesFavoritesContainer, menuHighlights.peoplesFavorites, {
    emptyMessage: "Popular picks will appear here after enough order activity is collected.",
    emptyTestId: "peoples-favorites-empty-state",
    cardOptions: (item) => ({
      topLabel: "People Favorite",
      testIdPrefix: "peoples-favorites-card",
      metricLabel: item.orderedQuantity ? `Ordered ${Number(item.orderedQuantity).toLocaleString("id-ID")} portion(s)` : "",
    }),
  });

  renderHighlightSection(chefsPickContainer, menuHighlights.chefsPick, {
    emptyMessage: "Chef's Pick will appear here once the staff starts voting.",
    emptyTestId: "chefs-pick-empty-state",
    cardOptions: (item) => ({
      topLabel: "Staff Voted",
      testIdPrefix: "chefs-pick-card",
      forceChefPick: true,
      metricLabel: item.voteCount ? `${Number(item.voteCount).toLocaleString("id-ID")} staff vote(s)` : "",
    }),
  });
}

function populateCategoryFilter(items) {
  const categories = [...new Set(items.map((item) => item.category))];
  categoryFilter.innerHTML = [
    `<option value="">All Categories</option>`,
    ...categories.map((category) => `<option value="${category}">${formatCategoryLabel(category)}</option>`),
  ].join("");
}

function renderMenu(items) {
  if (items.length === 0) {
    renderGridState(menuContainer, "No menu items match your search.", "menu-empty-state");
    return;
  }

  menuContainer.innerHTML = items.map((item) => createMenuCard(item)).join("");
}

function filterMenu() {
  const searchValue = searchInput.value.toLowerCase();
  const selectedCategory = categoryFilter.value;

  const filtered = menu.filter((item) => {
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
  } catch (error) {
    console.error(error);
    menu = LOCAL_MENU_FALLBACK.map((item, index) => ({
      ...item,
      id: `fallback-${index + 1}`,
      isAvailable: true,
    }));
  }

  populateCategoryFilter(menu);
  renderMenu(menu);
  return menu;
}

async function loadMenuHighlights() {
  renderHighlightsLoadingState();

  try {
    const response = await apiFetch("/menu/highlights", {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Failed to load menu highlights.");
    }

    menuHighlights = await readJsonResponse(response);
  } catch (error) {
    console.error(error);
    menuHighlights = {
      todaysRecommendation: getDailyRecommendationFallback(menu),
      peoplesFavorites: [],
      chefsPick: [],
      chefsPickIds: [],
    };
  }

  renderHighlights();
  return menuHighlights;
}

window.menuReady = (async () => {
  await loadMenu();
  await loadMenuHighlights();
  return menu;
})();
