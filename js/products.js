import { getProducts } from './api.js';
import { deriveCategories, filterAndSortProducts } from './core.js';
import { emptyState, errorState, escapeHtml, initCommonUI, productCard, skeletonCards } from './ui.js';

const grid = document.querySelector('#products-grid');
const form = document.querySelector('#filters-form');
const sort = document.querySelector('#sort-products');
const pagination = document.querySelector('#products-pagination');
const paginationNav = document.querySelector('#products-pagination-nav');
const productsPerPage = 6;
const params = new URLSearchParams(location.search);
let allProducts = [];
let currentPage = Math.max(
  1,
  parseInt(params.get('page'), 10) || 1
);
function options(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')).map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
}

function populateFilters() {
  const active = allProducts.filter((product) => product.active !== false);
  form.category.insertAdjacentHTML('beforeend', options(active.map((product) => product.category)));
  form.brand.insertAdjacentHTML('beforeend', options(active.map((product) => product.brand)));
  form.color.insertAdjacentHTML('beforeend', options(active.flatMap((product) => product.colors || [])));
  form.size.insertAdjacentHTML('beforeend', options(active.flatMap((product) => product.sizes || [])));
  ['category', 'brand', 'color', 'size', 'minPrice', 'maxPrice'].forEach((name) => { if (params.get(name)) form.elements[name].value = params.get(name); });
  form.inStock.checked = params.get('inStock') === '1';
  form.discounted.checked = params.get('discounted') === '1';
  form.featured.checked = params.get('featured') === '1';
  sort.value = params.get('sort') || 'relevance';
  updateSubcategories(params.get('subcategory') || '');
}

function updateSubcategories(selected = '') {
  const category = form.category.value;
  const source = category ? allProducts.filter((product) => product.category === category) : allProducts;
  form.subcategory.innerHTML = `<option value="">Toutes</option>${options(source.map((product) => product.subcategory))}`;
  if ([...form.subcategory.options].some((option) => option.value === selected)) form.subcategory.value = selected;
}

function readFilters() {
  return {
    query: params.get('q') || '',
    category: form.category.value,
    subcategory: form.subcategory.value,
    brand: form.brand.value,
    color: form.color.value,
    size: form.size.value,
    minPrice: form.minPrice.value === '' ? null : Number(form.minPrice.value),
    maxPrice: form.maxPrice.value === '' ? null : Number(form.maxPrice.value),
    inStock: form.inStock.checked,
    discounted: form.discounted.checked,
    featured: form.featured.checked,
    sort: sort.value,
  };
}

function updateUrl(filters) {
  const next = new URLSearchParams();
  if (filters.query) next.set('q', filters.query);
  ['category', 'subcategory', 'brand', 'color', 'size'].forEach((key) => { if (filters[key]) next.set(key, filters[key]); });
  if (filters.minPrice !== null) next.set('minPrice', filters.minPrice);
  if (filters.maxPrice !== null) next.set('maxPrice', filters.maxPrice);
  if (filters.inStock) next.set('inStock', '1');
  if (filters.discounted) next.set('discounted', '1');
  if (filters.featured) next.set('featured', '1');
  if (filters.sort !== 'relevance') next.set('sort', filters.sort);
  if (currentPage > 1) {
  next.set('page', currentPage);
}
  history.replaceState({}, '', `${location.pathname}${next.size ? `?${next}` : ''}`);
}
function renderPagination(totalPages) {
  paginationNav.classList.toggle('d-none', totalPages === 0);

  if (totalPages === 0) {
    pagination.innerHTML = '';
    return;
  }

  const buttons = Array.from(
    { length: totalPages },
    (_, index) => {
      const page = index + 1;
      const active = page === currentPage;

      return `
        <li class="page-item ${active ? 'active' : ''}">
          <button
            class="page-link"
            type="button"
            data-page="${page}"
            ${active ? 'aria-current="page"' : ''}
          >
            ${page}
          </button>
        </li>
      `;
    }
  ).join('');

  pagination.innerHTML = `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <button
        class="page-link"
        type="button"
        data-page="${currentPage - 1}"
        ${currentPage === 1 ? 'disabled' : ''}
      >
        &lt;
      </button>
    </li>

    ${buttons}

    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <button
        class="page-link"
        type="button"
        data-page="${currentPage + 1}"
        ${currentPage === totalPages ? 'disabled' : ''}
      >
        &gt;
      </button>
    </li>
  `;
}
function render() {
  const filters = readFilters();

  const products = filterAndSortProducts(
    allProducts,
    filters
  );

  const totalPages = Math.ceil(
    products.length / productsPerPage
  );

  currentPage = totalPages
    ? Math.min(Math.max(currentPage, 1), totalPages)
    : 1;

  const start = (currentPage - 1) * productsPerPage;

  const displayedProducts = products.slice(
    start,
    start + productsPerPage
  );

  updateUrl(filters);

  document.querySelector('#result-count').textContent =
    `${products.length} produit${products.length > 1 ? 's' : ''}`;

  const alert = document.querySelector('#active-search');

  if (filters.query) {
    alert.textContent = `Résultats pour « ${filters.query} »`;
    alert.classList.remove('d-none');
  } else {
    alert.classList.add('d-none');
  }

  grid.innerHTML = products.length
    ? displayedProducts
        .map((product) => `
          <div class="col">
            ${productCard(product)}
          </div>
        `)
        .join('')
    : `<div class="col-12">${emptyState()}</div>`;

  renderPagination(totalPages);
}

async function initCatalog() {
  grid.innerHTML = skeletonCards(6);
  allProducts = await getProducts();
  initCommonUI(allProducts);
  populateFilters();
  render();
  form.addEventListener('change', (event) => { if (event.target.name === 'category') updateSubcategories(); render(); });
  form.addEventListener('input', (event) => { if (['minPrice', 'maxPrice'].includes(event.target.name)) render(); });
  form.addEventListener('reset', () => setTimeout(() => { params.delete('q'); updateSubcategories(); sort.value = 'relevance'; render(); }, 0));
  sort.addEventListener('change', render);
}
form.addEventListener('change', (event) => {
  if (event.target.name === 'category') {
    updateSubcategories();
  }

  currentPage = 1;
  render();
});

form.addEventListener('input', (event) => {
  if (['minPrice', 'maxPrice'].includes(event.target.name)) {
    currentPage = 1;
    render();
  }
});

form.addEventListener('reset', () => {
  setTimeout(() => {
    params.delete('q');
    updateSubcategories();
    sort.value = 'relevance';
    currentPage = 1;
    render();
  }, 0);
});

sort.addEventListener('change', () => {
  currentPage = 1;
  render();
});

pagination.addEventListener('click', (event) => {
  const button = event.target.closest('[data-page]');

  if (!button || button.disabled) return;

  currentPage = Number(button.dataset.page);

  render();

  document
    .querySelector('.result-toolbar')
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
});
initCatalog().catch((error) => {
  console.error(error);
  grid.innerHTML = `<div class="col-12">${errorState(error.message)}</div>`;
  document.querySelector('[data-retry]')?.addEventListener('click', () => location.reload());
});
