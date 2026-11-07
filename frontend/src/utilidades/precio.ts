/** Un precio de 0 no es "$ 0": en la agenda del organizador es "Gratis". */
export function fmtCOP(valor: number): string {
  if (valor <= 0) return 'Gratis';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor);
}

/** 30000 → "$30.000", sin espacio ni "COP": como lo escribe la landing en botones. 0 → "Gratis". */
export function precioCorto(valor: number): string {
  if (valor <= 0) return 'Gratis';
  return `$${Math.round(valor).toLocaleString('es-CO')}`;
}

/** 30000 → "$30.000 COP"; 0 → "Gratis". Para la ficha y el diálogo. */
export function precioConMoneda(valor: number): string {
  return valor <= 0 ? 'Gratis' : `${precioCorto(valor)} COP`;
}
