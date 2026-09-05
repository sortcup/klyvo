import { getProducts } from './api.js';

import {
  productAvailableStock,
  recommendProducts
} from './core.js';

import {
  escapeHtml,
  initCommonUI,
  productCard,
  skeletonCards
} from './ui.js';

import { initProductSlider } from './product-slider.js';

const icons = {
  Téléphonie: 'bi-phone',
  Gaming: 'bi-controller',
  Automobile: 'bi-car-front',
  Bureautique: 'bi-laptop'
};

function sliderSkeletons() {
  return `
    <div class="product-slider-track">
      ${skeletonCards(4)}
    </div>
  `;
}

function renderProductSlider(container, products) {
  container.innerHTML = `
    <div class="product-slider-track">
      ${products.map((product) => `
        <div class="product-slide">
          ${productCard(product)}
        </div>
      `).join('')}
    </div>
  `;

  initProductSlider(container);
}

async function initHome() {
  const featured = document.querySelector(
    '#featured-products'
  );

  const deals = document.querySelector(
    '#discount-products'
  );

  const newest = document.querySelector(
    '#new-products'
  );

  const recommended = document.querySelector(
    '#recommended-products-home'
  );

  featured.innerHTML = sliderSkeletons();
  deals.innerHTML = sliderSkeletons();
  newest.innerHTML = sliderSkeletons();
  recommended.innerHTML = sliderSkeletons();

  const products = await getProducts();

  initCommonUI(products);

  const active = products.filter(
    (product) => product.active !== false
  );

  /*
   * Categories: رجعوا كيف كانوا
   */
  const categories = [
    ...new Set(
      active.map((product) => product.category)
    )
  ];

  document.querySelector('#category-grid').innerHTML =
    categories.map((category) => {
      const count = active.filter(
        (product) => product.category === category
      ).length;

      return `
        <div class="col">
          <a
            class="category-tile"
            href="products.html?category=${encodeURIComponent(category)}"
          >
            <span class="category-icon">
              <i class="bi ${icons[category] || 'bi-grid'}"></i>
            </span>

            <span>
              <h3>${escapeHtml(category)}</h3>

              <p>
                ${count} produit${count > 1 ? 's' : ''}
              </p>
            </span>

            <i class="bi bi-chevron-right ms-auto text-secondary"></i>
          </a>
        </div>
      `;
    }).join('');

  /*
   * Produits vedettes
   */
  const featuredProducts = active
    .filter((product) => product.featured)
    .slice(0, 4);

  /*
   * Bons plans
   */
  const dealProducts = active
    .filter((product) => {
      return (
        Number(product.discountPrice) > 0 &&
        productAvailableStock(product) > 0
      );
    })
    .slice(0, 4);

  /*
   * Nouveautés
   */
  const newProducts = [...active]
    .sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    )
    .slice(0, 4);

  /*
   * Recommandés
   */
  const reference =
    active.find((product) => product.featured) ||
    active[0];

  const recommendedProducts = recommendProducts(
    active,
    reference,
    4
  );

  renderProductSlider(
    featured,
    featuredProducts
  );

  renderProductSlider(
    deals,
    dealProducts
  );

  renderProductSlider(
    newest,
    newProducts
  );

  renderProductSlider(
    recommended,
    recommendedProducts
  );
}

initHome().catch((error) => {
  console.error(error);

  document
    .querySelectorAll(`
      #featured-products,
      #discount-products,
      #new-products,
      #recommended-products-home
    `)
    .forEach((target) => {
      target.innerHTML = `
        <p class="text-danger">
          Le catalogue est momentanément indisponible.
        </p>
      `;
    });
});