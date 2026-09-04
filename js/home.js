import { getProducts } from './api.js';
import { productAvailableStock, recommendProducts } from './core.js';
import { escapeHtml, initCommonUI, productCard, skeletonCards } from './ui.js';

const icons = { 'Téléphonie': 'bi-phone', Gaming: 'bi-controller', Automobile: 'bi-car-front', Bureautique: 'bi-laptop' };

async function initHome() {
  const featured = document.querySelector('#featured-products');
  const deals = document.querySelector('#discount-products');
  const newest = document.querySelector('#new-products');
  const recommended = document.querySelector('#recommended-products-home');
  featured.innerHTML = skeletonCards(4);
  deals.innerHTML = skeletonCards(4);
  newest.innerHTML = skeletonCards(4);
  recommended.innerHTML = skeletonCards(4);

  const products = await getProducts();
  initCommonUI(products);
  const active = products.filter((product) => product.active !== false);
  const categories = [...new Set(active.map((product) => product.category))];
  document.querySelector('#category-grid').innerHTML = categories.map((category) => {
    const count = active.filter((product) => product.category === category).length;
    return `<div class="col"><a class="category-tile" href="products.html?category=${encodeURIComponent(category)}"><span class="category-icon"><i class="bi ${icons[category] || 'bi-grid'}"></i></span><span><h3>${escapeHtml(category)}</h3><p>${count} produit${count > 1 ? 's' : ''}</p></span><i class="bi bi-chevron-right ms-auto text-secondary"></i></a></div>`;
  }).join('');
  featured.innerHTML = active.filter((product) => product.featured).slice(0, 4).map((product) => `<div class="col">${productCard(product)}</div>`).join('');
  deals.innerHTML = active.filter((product) => Number(product.discountPrice) > 0 && productAvailableStock(product) > 0).slice(0, 4).map((product) => `<div class="col">${productCard(product)}</div>`).join('');
  newest.innerHTML = [...active].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map((product) => `<div class="col">${productCard(product)}</div>`).join('');
  const reference = active.find((product) => product.featured) || active[0];
  recommended.innerHTML = recommendProducts(active, reference, 4).map((product) => `<div class="col">${productCard(product)}</div>`).join('');
}

initHome().catch((error) => {
  console.error(error);
  document.querySelectorAll('#featured-products, #discount-products, #new-products, #recommended-products-home').forEach((target) => { target.innerHTML = '<p class="text-danger">Le catalogue est momentanément indisponible.</p>'; });
});
