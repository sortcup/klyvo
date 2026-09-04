import { STORE_CONFIG } from './config.js';

const trim = (value) => String(value ?? '').trim();
const CACHE_KEY = `techzone-products-cache:${STORE_CONFIG.apiUrl || 'demo'}`;

export function createRequestId() {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `req-${uuid}`;
}

export function buildOrderRequest(customer, items, requestId = createRequestId()) {
  return {
    action: 'createOrder',
    requestId,
    customer: {
      name: trim(customer.name),
      email: trim(customer.email).toLocaleLowerCase('fr'),
      phone: trim(customer.phone),
      address: trim(customer.address),
      city: trim(customer.city),
      postalCode: trim(customer.postalCode),
      instructions: trim(customer.instructions),
      paymentMethod: trim(customer.paymentMethod),
    },
    items: items.map((item) => ({
      productId: trim(item.productId),
      color: trim(item.color),
      size: trim(item.size),
      quantity: Number(item.quantity),
    })),
  };
}

export function normalizeProductsResponse(response) {
  if (!response?.success) throw new Error(response?.message || 'Impossible de charger les produits.');
  const products = response?.data?.products;
  if (!Array.isArray(products)) throw new Error('Réponse du catalogue non valide.');
  return products;
}

function readCache() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
    return cached && Date.now() - cached.savedAt < STORE_CONFIG.cacheDurationMs ? cached.products : null;
  } catch {
    return null;
  }
}

function writeCache(products) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), products }));
  } catch {
    // The catalog remains usable when browser storage is unavailable.
  }
}

export async function getProducts({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) return cached;
  }
  if (STORE_CONFIG.apiUrl) {
    const response = await fetch(`${STORE_CONFIG.apiUrl}?action=products`, { redirect: 'follow' });
    if (!response.ok) throw new Error('Service temporairement indisponible.');
    const products = normalizeProductsResponse(await response.json());
    writeCache(products);
    return products;
  }
  const { DEMO_PRODUCTS } = await import('./data.js');
  writeCache(DEMO_PRODUCTS);
  return DEMO_PRODUCTS;
}

export async function getProduct(id) {
  return (await getProducts()).find((product) => product.id === id && product.active !== false) || null;
}

export async function submitOrder(customer, items, requestId) {
  const payload = buildOrderRequest(customer, items, requestId);
  if (!STORE_CONFIG.apiUrl) {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return { success: true, data: { orderId: `DEMO-${Date.now().toString(36).toUpperCase()}`, demo: true } };
  }
  const response = await fetch(STORE_CONFIG.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'La commande n’a pas pu être enregistrée.');
  return result;
}
