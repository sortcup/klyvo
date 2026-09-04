import { cartLineKey, clampQuantity, effectivePrice } from './core.js';

const STORAGE_KEY = 'techzone-cart-v1';

export function createCartStore(storage = globalThis.localStorage) {
  let items = [];
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) || '[]');
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    items = [];
  }

  const persist = () => {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* Cart still works for this page view. */ }
  };

  const clone = () => items.map((item) => ({ ...item }));

  return {
    getItems: clone,
    add(product, options = {}) {
      const line = {
        key: cartLineKey({ productId: product.id, color: options.color, size: options.size }),
        productId: product.id,
        name: product.name,
        sku: product.sku,
        image: product.image,
        color: options.color || '',
        size: options.size || '',
        unitPrice: Number.isFinite(Number(options.unitPrice)) ? Number(options.unitPrice) : effectivePrice(product),
        stock: Number(options.stock ?? product.stock ?? 0),
        quantity: clampQuantity(options.quantity, Number(options.stock ?? product.stock ?? 0)),
      };
      if (!line.quantity) return clone();
      const existing = items.find((item) => item.key === line.key);
      if (existing) existing.quantity = clampQuantity(existing.quantity + line.quantity, line.stock);
      else items.push(line);
      persist();
      return clone();
    },
    update(key, quantity) {
      const item = items.find((entry) => entry.key === key);
      if (!item) return clone();
      item.quantity = clampQuantity(quantity, item.stock);
      if (!item.quantity) items = items.filter((entry) => entry.key !== key);
      persist();
      return clone();
    },
    remove(key) {
      items = items.filter((item) => item.key !== key);
      persist();
      return clone();
    },
    clear() {
      items = [];
      try { storage?.removeItem(STORAGE_KEY); } catch { /* No persistent storage to clear. */ }
      return [];
    },
    getSummary(deliveryFee = 0) {
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const fee = itemCount ? Number(deliveryFee || 0) : 0;
      return { itemCount, subtotal, deliveryFee: fee, total: subtotal + fee };
    },
  };
}

export const cartStore = typeof window === 'undefined' ? null : createCartStore();
