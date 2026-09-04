import { getProducts } from './api.js';
import { formatPrice, recommendProducts } from './core.js';
import { STORE_CONFIG } from './config.js';
import { cartStore } from './cart-store.js';
import { emptyState, escapeHtml, initCommonUI, productCard, showToast, updateCartBadge } from './ui.js';

const root = document.querySelector('#cart-content');
let products = [];

function deliveryFee(subtotal) {
  return subtotal >= STORE_CONFIG.freeDeliveryThreshold ? 0 : STORE_CONFIG.deliveryFee;
}

function summary(items) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const fee = items.length ? deliveryFee(subtotal) : 0;
  return { subtotal, fee, total: subtotal + fee, count: items.reduce((sum, item) => sum + item.quantity, 0) };
}

function renderRecommendations(items) {
  const section = document.querySelector('#cart-recommendations');
  const selected = products.find((product) => product.id === items[0]?.productId);
  const recommendations = selected ? recommendProducts(products, selected, 4) : [];
  section.hidden = !recommendations.length;
  if (recommendations.length) document.querySelector('#recommended-products').innerHTML = recommendations.map((product) => `<div class="col">${productCard(product)}</div>`).join('');
}

function renderCart() {
  const items = cartStore.getItems();
  updateCartBadge();
  const totals = summary(items);
  document.querySelector('#cart-count-label').textContent = `${totals.count} article${totals.count > 1 ? 's' : ''} dans votre panier`;
  if (!items.length) {
    root.innerHTML = emptyState('Votre panier est vide', 'Découvrez le catalogue et ajoutez les produits qui vous intéressent.');
    document.querySelector('#cart-recommendations').hidden = true;
    return;
  }
  root.innerHTML = `<div class="row g-4"><div class="col-lg-8"><div class="checkout-card">
    <div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h4 mb-0">Articles</h2><button class="btn btn-sm btn-outline-danger" type="button" id="clear-cart"><i class="bi bi-trash3 me-1"></i>Vider le panier</button></div>
    <div id="cart-items">${items.map((item) => `<article class="cart-item" data-cart-key="${escapeHtml(item.key)}"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" width="96" height="84"><div><a class="cart-item-title" href="product.html?id=${encodeURIComponent(item.productId)}">${escapeHtml(item.name)}</a><div class="cart-item-meta">Réf. ${escapeHtml(item.sku)}${item.color ? ` · ${escapeHtml(item.color)}` : ''}${item.size ? ` · ${escapeHtml(item.size)}` : ''}</div><div class="product-price mt-2">${formatPrice(item.unitPrice)}</div></div><div class="cart-item-actions text-end"><div class="quantity-control"><button type="button" data-cart-change="-1" aria-label="Diminuer la quantité">−</button><input type="number" value="${item.quantity}" min="1" max="${item.stock}" aria-label="Quantité de ${escapeHtml(item.name)}" data-cart-quantity><button type="button" data-cart-change="1" aria-label="Augmenter la quantité">+</button></div><button class="btn btn-sm btn-link text-danger d-block ms-auto mt-2" type="button" data-cart-remove>Supprimer</button></div></article>`).join('')}</div>
    <a href="products.html" class="btn btn-outline-primary mt-4"><i class="bi bi-arrow-left me-1"></i>Continuer mes achats</a>
  </div></div><div class="col-lg-4"><aside class="summary-card" aria-label="Total du panier"><h2 class="h4 mb-3">Résumé</h2><div class="summary-line"><span>Sous-total</span><strong>${formatPrice(totals.subtotal)}</strong></div><div class="summary-line"><span>Livraison</span><strong>${totals.fee ? formatPrice(totals.fee) : 'Offerte'}</strong></div>${totals.fee ? `<p class="small text-secondary mt-2">Livraison offerte dès ${formatPrice(STORE_CONFIG.freeDeliveryThreshold)}.</p>` : '<p class="small text-success mt-2"><i class="bi bi-check-circle me-1"></i>Vous bénéficiez de la livraison offerte.</p>'}<div class="summary-line summary-total"><span>Total</span><span>${formatPrice(totals.total)}</span></div><a href="checkout.html" class="btn btn-primary btn-lg w-100 mt-3">Passer la commande <i class="bi bi-arrow-right ms-1"></i></a><p class="small text-secondary text-center mt-3 mb-0"><i class="bi bi-shield-check me-1"></i>Prix et stock revérifiés avant confirmation</p></aside></div></div>`;

  root.querySelector('#cart-items').addEventListener('click', (event) => {
    const article = event.target.closest('[data-cart-key]');
    if (!article) return;
    const key = article.dataset.cartKey;
    const input = article.querySelector('[data-cart-quantity]');
    if (event.target.closest('[data-cart-change]')) cartStore.update(key, Number(input.value) + Number(event.target.closest('[data-cart-change]').dataset.cartChange));
    if (event.target.closest('[data-cart-remove]')) { cartStore.remove(key); showToast('Produit retiré du panier.', 'primary'); }
    renderCart();
  });
  root.querySelectorAll('[data-cart-quantity]').forEach((input) => input.addEventListener('change', () => { cartStore.update(input.closest('[data-cart-key]').dataset.cartKey, input.value); renderCart(); }));
  root.querySelector('#clear-cart').addEventListener('click', () => { if (confirm('Voulez-vous vraiment supprimer tous les articles du panier ?')) { cartStore.clear(); renderCart(); showToast('Le panier a été vidé.', 'primary'); } });
  renderRecommendations(items);
}

async function initCart() {
  products = await getProducts();
  initCommonUI(products);
  renderCart();
}

initCart().catch((error) => { console.error(error); initCommonUI([]); renderCart(); });
