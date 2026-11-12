/** Pesos chilenos sin decimales: 129990 -> "$129.990". */
export const formatearCLP = (valor) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(valor) || 0);
