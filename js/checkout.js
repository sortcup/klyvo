import { createRequestId, getProducts, submitOrder } from './api.js';
import { formatPrice, validateCheckout } from './core.js';
import { STORE_CONFIG } from './config.js';
import { cartStore } from './cart-store.js';
import { emptyState, escapeHtml, initCommonUI, updateCartBadge } from './ui.js';

const root = document.querySelector('#checkout-root');
const form = document.querySelector('#checkout-form');
const items = cartStore.getItems();
const requestStorageKey = 'techzone-order-request-id';
let orderRequestId;
try {
  orderRequestId = sessionStorage.getItem(requestStorageKey) || createRequestId();
  sessionStorage.setItem(requestStorageKey, orderRequestId);
} catch {
  orderRequestId = createRequestId();
}

function totals() {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const fee = subtotal >= STORE_CONFIG.freeDeliveryThreshold ? 0 : STORE_CONFIG.deliveryFee;
  return { subtotal, fee, total: subtotal + fee };
}

function renderSummary() {
  const result = totals();
  document.querySelector('#checkout-summary').innerHTML = `<h2 class="h4 mb-3">Votre commande</h2><div class="d-grid gap-3 mb-3">${items.map((item) => `<div class="d-flex gap-2 align-items-center"><img src="${escapeHtml(item.image)}" alt="" width="54" height="48" class="rounded object-fit-cover"><div class="flex-grow-1"><strong class="d-block small">${escapeHtml(item.name)}</strong><span class="small text-secondary">${item.quantity} × ${formatPrice(item.unitPrice)}</span></div><strong class="small">${formatPrice(item.unitPrice * item.quantity)}</strong></div>`).join('')}</div><div class="summary-line border-top pt-3"><span>Sous-total</span><strong>${formatPrice(result.subtotal)}</strong></div><div class="summary-line"><span>Livraison</span><strong>${result.fee ? formatPrice(result.fee) : 'Offerte'}</strong></div><div class="summary-line summary-total"><span>Total</span><span>${formatPrice(result.total)}</span></div><a href="cart.html" class="btn btn-link w-100 mt-2"><i class="bi bi-arrow-left me-1"></i>Modifier le panier</a>`;
}

function values() {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function showErrors(errors) {
  form.querySelectorAll('.is-invalid').forEach((field) => field.classList.remove('is-invalid'));
  form.querySelectorAll('.invalid-feedback').forEach((message) => { message.textContent = ''; });
  Object.entries(errors).forEach(([name, message]) => {
    if (name === 'paymentMethod') { document.querySelector('#payment-error').textContent = message; return; }
    const field = form.elements[name];
    if (field) { field.classList.add('is-invalid'); field.parentElement.querySelector('.invalid-feedback').textContent = message; }
  });
  form.querySelector('.is-invalid')?.focus();
}

function setSubmitting(active) {
  const button = document.querySelector('#submit-order');
  button.disabled = active;
  button.querySelector('.button-label').textContent = active ? 'Vérification en cours…' : 'Confirmer la commande';
  button.querySelector('.spinner-border').classList.toggle('d-none', !active);
}

async function handleSubmit(event) {
  event.preventDefault();
  const customer = values();
  const errors = validateCheckout(customer);
  showErrors(errors);
  if (Object.keys(errors).length) return;
  const alert = document.querySelector('#checkout-error');
  alert.classList.add('d-none');
  setSubmitting(true);
  try {
    const result = await submitOrder(customer, items, orderRequestId);
    const orderId = result.data.orderId;
    if (result.data.demo) {
      root.innerHTML = `<div class="confirmation-card"><div class="confirmation-icon"><i class="bi bi-eye"></i></div><p class="eyebrow mb-2">Mode démonstration</p><h2>Simulation terminée</h2><p>Le parcours fonctionne, mais aucune commande n’a été enregistrée. Votre panier a été conservé.</p><p class="small text-secondary">Connectez Google Sheets dans la configuration pour recevoir de vraies commandes.</p><a href="cart.html" class="btn btn-primary mt-2">Revenir au panier</a></div>`;
      return;
    }
    cartStore.clear();
    try { sessionStorage.removeItem(requestStorageKey); } catch { /* The confirmed order is already idempotent on the server. */ }
    updateCartBadge();
    root.innerHTML = `<div class="confirmation-card"><div class="confirmation-icon"><i class="bi bi-check-lg"></i></div><p class="eyebrow mb-2">Commande confirmée</p><h2>Merci pour votre commande !</h2><p>Votre référence est <strong>${escapeHtml(orderId)}</strong>. Le total vérifié est de <strong>${formatPrice(result.data.total)}</strong>.</p><p>Nous vous contacterons pour confirmer la livraison.</p><a href="products.html" class="btn btn-primary mt-2">Continuer mes achats</a></div>`;
  } catch (error) {
    alert.textContent = error.message || 'La commande n’a pas pu être enregistrée. Veuillez réessayer.';
    alert.classList.remove('d-none');
    alert.focus();
    setSubmitting(false);
  }
}

async function initCheckout() {
  const products = await getProducts();
  initCommonUI(products);
  if (!items.length) { root.innerHTML = emptyState('Votre panier est vide', 'Ajoutez au moins un produit avant de passer commande.'); return; }
  renderSummary();
  form.addEventListener('submit', handleSubmit);
  form.addEventListener('input', (event) => { event.target.classList.remove('is-invalid'); const feedback = event.target.parentElement.querySelector('.invalid-feedback'); if (feedback) feedback.textContent = ''; });
}

initCheckout().catch((error) => { console.error(error); root.innerHTML = emptyState('Commande indisponible', 'Rechargez la page ou revenez au panier.'); });
