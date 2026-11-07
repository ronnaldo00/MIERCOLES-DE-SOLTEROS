/** Fechas en español para el sitio. Entrada: "YYYY-MM-DD HH:MM" (o vacío), como la manda la API. */

interface FechaParseada {
  fecha: Date;
  hora: number;
  minuto: number;
  tieneHora: boolean;
}

function parsear(fechaHora: string): FechaParseada | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(fechaHora?.trim() ?? '');
  if (!match) return null;
  const [, anio, mes, dia, hora, minuto] = match;
  const h = hora ? Number(hora) : 0;
  const m = minuto ? Number(minuto) : 0;
  // Hora local (sin "Z"): el string no trae zona horaria y leerlo como UTC
  // correría la fecha mostrada.
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia), h, m);
  return { fecha, hora: h, minuto: m, tieneHora: Boolean(hora) };
}

/** 23:00 → "11:00 p. m.", con el estilo que usaba el sitio original. */
function hora12(hora: number, minuto: number): string {
  const periodo = hora >= 12 ? 'p. m.' : 'a. m.';
  const h12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${h12}:${minuto.toString().padStart(2, '0')} ${periodo}`;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Mié 11 nov · 11:00 p. m.", para la agenda. */
export function formatearFechaCorta(fechaHora: string): string {
  const partes = parsear(fechaHora);
  if (!partes) return 'Fecha por confirmar';
  const { fecha, hora, minuto, tieneHora } = partes;
  const diaSemana = capitalizar(fecha.toLocaleDateString('es-CO', { weekday: 'short' })).replace('.', '');
  const mes = fecha.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
  const base = `${diaSemana} ${fecha.getDate()} ${mes}`;
  return tieneHora ? `${base} · ${hora12(hora, minuto)}` : base;
}

/** Para `sort`: los eventos sin fecha legible van siempre al final. */
export function compararPorFecha(fechaA: string, fechaB: string): number {
  const a = parsear(fechaA)?.fecha.getTime() ?? null;
  const b = parsear(fechaB)?.fecha.getTime() ?? null;
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

/** 19:00 → "7 p. m."; 19:30 → "7:30 p. m.". Estilo de la landing. */
function horaCorta(hora: number, minuto: number): string {
  const periodo = hora >= 12 ? 'p. m.' : 'a. m.';
  const h12 = hora % 12 === 0 ? 12 : hora % 12;
  return minuto ? `${h12}:${minuto.toString().padStart(2, '0')} ${periodo}` : `${h12} ${periodo}`;
}

export interface PartesFecha {
  /** "Mié." */
  diaSemana: string;
  /** "11 de noviembre" */
  diaMes: string;
  /** "7 p. m.", o null si la fecha no trae hora. */
  hora: string | null;
}

/** Piezas sueltas para la portada ("Mié. 11 de noviembre · 7 p. m.") y la ficha del evento. */
export function partesFecha(fechaHora: string): PartesFecha | null {
  const partes = parsear(fechaHora);
  if (!partes) return null;
  const { fecha, hora, minuto, tieneHora } = partes;
  const diaSemana = capitalizar(fecha.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')) + '.';
  const mes = fecha.toLocaleDateString('es-CO', { month: 'long' });
  return { diaSemana, diaMes: `${fecha.getDate()} de ${mes}`, hora: tieneHora ? horaCorta(hora, minuto) : null };
}
