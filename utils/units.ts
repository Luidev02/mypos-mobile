// ============================================================
// Unidades de medida, cantidades y reglas de stock.
//
// Puerto directo de `JiroPOS-Frontend/src/utils/units.js` para que móvil, web
// y backend compartan exactamente las mismas reglas.
//
// El backend expone en cada producto:
//   unit_measure_id    -> id en ref_measurement_units (70 = Unidad)
//   unit_measure_code  -> código DIAN ("94", "KGM", "LBR", "GLL")
//   unit_measure_name  -> "Unidad", "Kilogramo", ...
//   is_weighable       -> 1/0 derivado (unidad distinta de "Unidad")
//   stock_type         -> 'fixed' | 'variable'
// ============================================================

import type { Product } from '@/types';

/** id de "Unidad" — debe coincidir con UNIT_MEASURE_UNIDAD_ID del backend. */
export const UNIT_MEASURE_UNIDAD_ID = 70;

/** Decimales admitidos en cantidades — la balanza emite gramos (0.230). */
export const QUANTITY_DECIMALS = 3;

/** Etiqueta corta por código DIAN, para mostrar junto a la cantidad. */
const SHORT_LABELS: Record<string, string> = {
  '94': 'und',
  KGM: 'kg',
  LBR: 'lb',
  GLL: 'gal',
};

/** ¿El producto admite cantidades decimales (se vende por peso/volumen)? */
export function isWeighable(product?: Partial<Product> | null): boolean {
  if (!product) return false;
  if (product.is_weighable !== undefined && product.is_weighable !== null) {
    return Boolean(Number(product.is_weighable));
  }
  const id = Number(product.unit_measure_id);
  return Number.isFinite(id) && id !== UNIT_MEASURE_UNIDAD_ID;
}

/**
 * ¿El producto permite quedar con stock negativo?
 *
 * Es la misma condición que aplica el backend en `pos.service.js` antes de
 * rechazar una venta: solo los productos de stock variable (carnicería,
 * fruver…) pueden venderse por debajo de cero.
 */
export function hasVariableStock(product?: Partial<Product> | null): boolean {
  return product?.stock_type === 'variable';
}

/**
 * ¿Se puede vender esta cantidad del producto?
 *
 * Réplica de la validación del web (`BtnProducts.jsx` / `Newsales.jsx`) y del
 * backend: el stock variable nunca bloquea; el resto exige stock suficiente.
 */
export function canSellQuantity(
  product: Partial<Product> | null | undefined,
  quantity: number
): boolean {
  if (hasVariableStock(product)) return true;
  const stock = parseFloat(String(product?.stock ?? 0)) || 0;
  return quantity <= stock;
}

/** Etiqueta corta de la unidad ('kg', 'und', ...). */
export function unitShortLabel(product?: Partial<Product> | null): string {
  if (!product) return 'und';
  const code = product.unit_measure_code;
  if (code && SHORT_LABELS[code]) return SHORT_LABELS[code];
  return isWeighable(product) ? product.unit_measure_name || '' : 'und';
}

/** Redondea a la precisión de la BD — DECIMAL(15,3). */
export function roundQuantity(value: number | string): number {
  const n = parseFloat(String(value));
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(QUANTITY_DECIMALS));
}

/**
 * Formatea una cantidad para mostrar.
 * Pesable: hasta 3 decimales, sin ceros de relleno (0.230 -> "0.23", 2 -> "2").
 * Por unidad: entero.
 */
export function formatQuantity(
  quantity: number | string,
  product?: Partial<Product> | null
): string {
  const n = parseFloat(String(quantity));
  if (!Number.isFinite(n)) return '0';
  if (!isWeighable(product)) return String(Math.round(n));
  return String(Number(n.toFixed(QUANTITY_DECIMALS)));
}

/** Cantidad + unidad, como se muestra en el carrito y el ticket ("0.23 kg"). */
export function formatQuantityWithUnit(
  quantity: number | string,
  product?: Partial<Product> | null
): string {
  const qty = formatQuantity(quantity, product);
  const unit = unitShortLabel(product);
  return unit ? `${qty} ${unit}` : qty;
}
