const priceFormatter = new Intl.NumberFormat('fr-TN', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export function formatPrice(value) {
  const amount = Number(value);
  return `${priceFormatter.format(Number.isFinite(amount) ? amount : 0)} DT`;
}

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr');
}

export function effectivePrice(product) {
  const discount = Number(product?.discountPrice);
  return discount > 0 ? discount : Number(product?.price || 0);
}

function activeVariants(product) {
  return Array.isArray(product?.variants) ? product.variants.filter((variant) => variant.active !== false) : [];
}

export function productAvailableStock(product, selection = {}) {
  const variants = activeVariants(product);
  if (!variants.length) return Math.max(0, Number(product?.stock || 0));
  return variants
    .filter((variant) => (!selection.color || variant.color === selection.color) && (!selection.size || variant.size === selection.size))
    .reduce((sum, variant) => sum + Math.max(0, Number(variant.stock || 0)), 0);
}

export function selectedUnitPrice(product, selection = {}) {
  const variants = activeVariants(product).filter((variant) =>
    (!selection.color || variant.color === selection.color)
    && (!selection.size || variant.size === selection.size)
    && Number(variant.stock || 0) > 0);
  if (!variants.length) return effectivePrice(product);
  const prices = variants.map((variant) => Number(variant.price) > 0 ? Number(variant.price) : effectivePrice(product));
  return Math.min(...prices);
}

export function resolveVariantSelection(product, current = {}, next = {}) {
  const selection = { color: current.color || '', size: current.size || '' };
  if (next.type === 'color') selection.color = next.value || '';
  if (next.type === 'size') selection.size = next.value || '';
  if (selection.color && selection.size && productAvailableStock(product, selection) <= 0) {
    if (next.type === 'color') selection.size = '';
    if (next.type === 'size') selection.color = '';
  }
  return selection;
}

export function deriveCategories(products = []) {
  const taxonomy = new Map();
  products.forEach(({ category, subcategory }) => {
    if (!category) return;
    if (!taxonomy.has(category)) taxonomy.set(category, new Set());
    if (subcategory) taxonomy.get(category).add(subcategory);
  });
  return [...taxonomy.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([name, subcategories]) => ({
      name,
      subcategories: [...subcategories].sort((a, b) => a.localeCompare(b, 'fr')),
    }));
}

export function searchProducts(products = [], query = '') {
  const needle = normalizeText(query).trim();
  if (!needle) return [...products];
  return products.filter((product) => {
    const haystack = [
      product.name,
      product.sku,
      product.barcode,
      product.brand,
      product.category,
      product.subcategory,
      product.description,
      product.shortDescription,
      ...(product.tags || []),
    ].map(normalizeText).join(' ');
    return haystack.includes(needle);
  });
}

export function filterAndSortProducts(products = [], filters = {}) {
  let result = searchProducts(products, filters.query).filter((product) => product.active !== false);
  const selected = (value, actual) => !value || value === actual;
  const hasNumericBound = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  result = result.filter((product) => {
    const price = selectedUnitPrice(product);
    return selected(filters.category, product.category)
      && selected(filters.subcategory, product.subcategory)
      && selected(filters.brand, product.brand)
      && (!filters.color || (product.colors || []).includes(filters.color))
      && (!filters.size || (product.sizes || []).includes(filters.size))
      && (!hasNumericBound(filters.minPrice) || price >= Number(filters.minPrice))
      && (!hasNumericBound(filters.maxPrice) || price <= Number(filters.maxPrice))
      && (!filters.inStock || productAvailableStock(product) > 0)
      && (!filters.discounted || Number(product.discountPrice) > 0)
      && (!filters.featured || product.featured === true);
  });

  const comparators = {
    'price-asc': (a, b) => selectedUnitPrice(a) - selectedUnitPrice(b),
    'price-desc': (a, b) => selectedUnitPrice(b) - selectedUnitPrice(a),
    newest: (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
    name: (a, b) => a.name.localeCompare(b.name, 'fr'),
    featured: (a, b) => Number(b.featured) - Number(a.featured),
  };
  if ((!filters.sort || filters.sort === 'relevance') && filters.query) {
    const query = normalizeText(filters.query).trim();
    const score = (product) => {
      const name = normalizeText(product.name);
      const sku = normalizeText(product.sku);
      const barcode = normalizeText(product.barcode);
      if ([name, sku, barcode].includes(query)) return 100;
      if (name.startsWith(query)) return 70;
      if (name.split(/\s+/).some((word) => word.startsWith(query))) return 50;
      if (sku.startsWith(query) || barcode.startsWith(query)) return 40;
      return 10;
    };
    return result.sort((a, b) => score(b) - score(a));
  }
  return result.sort(comparators[filters.sort] || (() => 0));
}

export function recommendProducts(products = [], selectedProduct, limit = 4) {
  if (!selectedProduct) return [];
  const selectedTags = new Set(selectedProduct.tags || []);
  return products
    .filter((product) => product.id !== selectedProduct.id && product.active !== false && productAvailableStock(product) > 0)
    .map((product) => {
      let score = 0;
      if (product.subcategory === selectedProduct.subcategory) score += 6;
      if (product.category === selectedProduct.category) score += 4;
      if (product.brand === selectedProduct.brand) score += 3;
      score += (product.tags || []).filter((tag) => selectedTags.has(tag)).length * 2;
      const reference = Math.max(selectedUnitPrice(selectedProduct), 1);
      if (Math.abs(selectedUnitPrice(product) - reference) / reference <= 0.35) score += 1;
      return { product, score };
    })
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'fr'))
    .slice(0, limit)
    .map(({ product }) => product);
}

export function cartLineKey({ productId, color = '', size = '' }) {
  return `${productId}::${color}::${size}`;
}

export function clampQuantity(quantity, stock) {
  const available = Math.max(0, Math.floor(Number(stock) || 0));
  if (available === 0) return 0;
  const requested = Math.floor(Number(quantity) || 1);
  return Math.min(Math.max(1, requested), available);
}

export function validateCheckout(customer = {}) {
  const errors = {};
  if (String(customer.name || '').trim().length < 3) errors.name = 'Veuillez saisir votre nom et prénom.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(customer.email || '').trim())) errors.email = 'Veuillez saisir une adresse e-mail valide.';
  const digits = String(customer.phone || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) errors.phone = 'Veuillez saisir un numéro de téléphone valide.';
  if (String(customer.address || '').trim().length < 5) errors.address = 'Veuillez saisir votre adresse de livraison.';
  if (String(customer.city || '').trim().length < 2) errors.city = 'Veuillez saisir votre ville.';
  if (String(customer.postalCode || '').trim().length < 3) errors.postalCode = 'Veuillez saisir votre code postal.';
  if (!customer.paymentMethod) errors.paymentMethod = 'Veuillez choisir un mode de paiement.';
  return errors;
}
