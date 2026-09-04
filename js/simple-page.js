import { getProducts } from './api.js';
import { initCommonUI } from './ui.js';

getProducts().then(initCommonUI).catch(() => initCommonUI([]));
