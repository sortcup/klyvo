import { deriveCategories, formatPrice, productAvailableStock, searchProducts, selectedUnitPrice } from './core.js';
import { STORE_CONFIG } from './config.js';
import { cartStore } from './cart-store.js';

export const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

export function productCard(product) {
  const sale = Number(product.discountPrice) > 0;
  const stock = productAvailableStock(product);
  const available = stock > 0;
  const displayedPrice = selectedUnitPrice(product);
  return `
    <article class="product-card card h-100 border-0" data-product-id="${escapeHtml(product.id)}">
      <a class="product-image-wrap" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="Voir ${escapeHtml(product.name)}">
        <img class="card-img-top product-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" width="560" height="420">
        <span class="product-badges">
          ${sale ? '<span class="badge text-bg-danger">Promo</span>' : ''}
          ${product.featured ? '<span class="badge badge-featured">Vedette</span>' : ''}
        </span>
      </a>
      <div class="card-body d-flex flex-column p-3 p-xl-4">
        <div class="product-meta mb-2">${escapeHtml(product.category)} · ${escapeHtml(product.brand)}</div>
        <h3 class="product-title h6"><a href="product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a></h3>
        <p class="product-description mb-3">${escapeHtml(product.shortDescription)}</p>
        <div class="mt-auto d-flex align-items-end justify-content-between gap-2">
          <div>
            ${sale ? `<div class="old-price">${formatPrice(product.price)}</div>` : ''}
            <div class="product-price">${Array.isArray(product.variants) && product.variants.length ? '<small>À partir de </small>' : ''}${formatPrice(displayedPrice)}</div>
          </div>
          <a href="product.html?id=${encodeURIComponent(product.id)}" class="btn btn-primary btn-icon" aria-label="Choisir ${escapeHtml(product.name)}"><i class="bi bi-arrow-right"></i></a>
        </div>
        <div class="stock-line ${available ? 'in-stock' : 'out-stock'} mt-3"><span></span>${available ? `${stock} en stock` : 'Rupture de stock'}</div>
      </div>
    </article>`;
}

export function skeletonCards(count = 4) {
  return Array.from({ length: count }, () => '<div class="col"><div class="card skeleton-card"><div class="skeleton skeleton-image"></div><div class="p-4"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line medium"></div></div></div></div>').join('');
}

export function emptyState(title = 'Aucun produit trouvé', text = 'Modifiez vos critères ou découvrez tout le catalogue.') {
  return `<div class="empty-state"><div class="empty-icon"><i class="bi bi-search"></i></div><h2 class="h4">${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p><a href="products.html" class="btn btn-outline-primary">Voir tous les produits</a></div>`;
}

export function errorState(message = 'Une erreur est survenue.') {
  return `<div class="empty-state"><div class="empty-icon danger"><i class="bi bi-exclamation-triangle"></i></div><h2 class="h4">Impossible de charger cette page</h2><p>${escapeHtml(message)}</p><button class="btn btn-primary" type="button" data-retry>Réessayer</button></div>`;
}

export function updateCartBadge() {
  const count = cartStore?.getSummary().itemCount || 0;
  document.querySelectorAll('[data-cart-count]').forEach((element) => {
    element.textContent = String(count);
    element.hidden = count === 0;
  });
}

export function showToast(message, type = 'success') {
  const region = document.querySelector('#toast-region') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'toast-region', className: 'toast-container position-fixed top-0 end-0 p-3' }));
  const toast = document.createElement('div');
  toast.className = `toast align-items-center border-0 text-bg-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fermer"></button></div>`;
  region.appendChild(toast);
  const instance = globalThis.bootstrap?.Toast.getOrCreateInstance(toast, { delay: 2800 });
  if (instance) instance.show();
  else toast.classList.add('show');
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

function renderHeader(products) {
  const target = document.querySelector('#site-header');
  if (!target) return;
  const categories = deriveCategories(products.filter((product) => product.active !== false));
  const categoryLinks = categories.map((category) => `
    <li><a class="dropdown-item d-flex justify-content-between" href="products.html?category=${encodeURIComponent(category.name)}"><span>${escapeHtml(category.name)}</span><span class="text-secondary">${category.subcategories.length}</span></a></li>`).join('');
  target.innerHTML = `
    <div class="utility-bar"><div class="container d-flex justify-content-between align-items-center"><span><i class="bi bi-truck me-2"></i>Livraison partout en Tunisie</span><span class="d-none d-sm-inline">Service client · ${escapeHtml(STORE_CONFIG.phone)}</span></div></div>
    <nav class="navbar navbar-expand-lg bg-white sticky-top" aria-label="Navigation principale">
      <div class="container py-2">
        <a class="navbar-brand brand-lockup" href="index.html" aria-label="TechZone Tunisie, accueil"><span class="brand-mark">TZ</span><span>TechZone<small>Tunisie</small></span></a>
        <div class="d-flex align-items-center gap-2 order-lg-3">
          <a href="cart.html" class="btn cart-button position-relative" aria-label="Voir le panier"><i class="bi bi-bag"></i><span class="d-none d-sm-inline">Panier</span><span class="cart-count" data-cart-count hidden>0</span></a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#main-nav" aria-controls="main-nav" aria-expanded="false" aria-label="Ouvrir le menu"><span class="navbar-toggler-icon"></span></button>
        </div>
        <div class="collapse navbar-collapse order-lg-2" id="main-nav">
          <ul class="navbar-nav ms-lg-5 align-items-lg-center gap-lg-2">
            <li class="nav-item"><a class="nav-link" href="index.html">Accueil</a></li>
            <li class="nav-item dropdown"><button class="nav-link dropdown-toggle border-0 bg-transparent" data-bs-toggle="dropdown" aria-expanded="false">Catégories</button><ul class="dropdown-menu shadow-sm">${categoryLinks}</ul></li>
            <li class="nav-item"><a class="nav-link" href="products.html?discounted=1">Promotions</a></li>
            <li class="nav-item"><a class="nav-link" href="#site-footer">Contact</a></li>
          </ul>
        </div>
      </div>
    </nav>
    <div class="command-bar">
      <div class="container">
        <form class="search-shell" data-global-search role="search">
          <i class="bi bi-search" aria-hidden="true"></i>
          <input type="search" name="q" autocomplete="off" placeholder="Rechercher un produit, une marque, un code-barres…" aria-label="Rechercher dans la boutique" aria-controls="search-suggestions" aria-expanded="false">
          <button type="submit" class="btn btn-primary">Rechercher</button>
          <div class="search-suggestions" id="search-suggestions" aria-label="Suggestions de recherche" hidden></div>
        </form>
      </div>
    </div>`;

  const form = target.querySelector('[data-global-search]');
  const input = form.querySelector('input');
  const suggestions = form.querySelector('.search-suggestions');
  const toggleSuggestions = (open) => { suggestions.hidden = !open; input.setAttribute('aria-expanded', String(open)); };
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const query = input.value.trim();
      if (query.length < 2) { toggleSuggestions(false); return; }
      const matches = searchProducts(products.filter((product) => product.active !== false), query).slice(0, 5);
      suggestions.innerHTML = matches.length ? matches.map((product) => `<a href="product.html?id=${encodeURIComponent(product.id)}"><img src="${escapeHtml(product.image)}" alt="" width="44" height="44"><span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)} · ${formatPrice(selectedUnitPrice(product))}</small></span></a>`).join('') : '<p>Aucun produit trouvé</p>';
      toggleSuggestions(true);
    }, 180);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (query) location.href = `products.html?q=${encodeURIComponent(query)}`;
  });
  input.addEventListener('keydown', (event) => { if (event.key === 'Escape') { toggleSuggestions(false); input.focus(); } });
  document.addEventListener('click', (event) => { if (!form.contains(event.target)) toggleSuggestions(false); });
}

function renderFooter() {
  const target = document.querySelector('#site-footer');
  if (!target) return;
  target.innerHTML = `
    <div class="container py-5">
      <div class="row g-4">
        <div class="col-lg-5"><a class="brand-lockup footer-brand" href="index.html"><span class="brand-mark">TZ</span><span>TechZone<small>Tunisie</small></span></a><p class="mt-3 footer-intro">Des accessoires fiables pour votre téléphone, votre espace gaming, votre voiture et votre bureau.</p></div>
        <div class="col-6 col-lg-2"><h2 class="footer-title">Boutique</h2><a href="products.html">Tous les produits</a><a href="products.html?featured=1">Produits vedettes</a><a href="products.html?discounted=1">Promotions</a></div>
        <div class="col-6 col-lg-2"><h2 class="footer-title">Aide</h2><a href="cart.html">Mon panier</a><a href="checkout.html">Commander</a><a href="docs.html">Livraison et paiement</a></div>
        <div class="col-lg-3"><h2 class="footer-title">Contact</h2><p><i class="bi bi-telephone me-2"></i>${escapeHtml(STORE_CONFIG.phone)}</p><p><i class="bi bi-envelope me-2"></i>${escapeHtml(STORE_CONFIG.email)}</p><p><i class="bi bi-geo-alt me-2"></i>${escapeHtml(STORE_CONFIG.address)}</p></div>
      </div>
    </div>
    <div class="footer-bottom"><div class="container d-flex flex-column flex-sm-row justify-content-between gap-2"><span>© ${new Date().getFullYear()} TechZone Tunisie</span><span>Paiement à la livraison · Prix en dinar tunisien</span></div></div>`;
}

export function initCommonUI(products = []) {
  renderHeader(products);
  renderFooter();
  updateCartBadge();
  const back = document.querySelector('#back-to-top');
  if (back) {
    addEventListener('scroll', () => back.classList.toggle('visible', scrollY > 420), { passive: true });
    back.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  }
}
