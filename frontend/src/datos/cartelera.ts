/**
 * Modelo de vista del sitio: lo que la portada, las cartas y el carrito
 * necesitan, venga de la API de Atonik o de contenido/eventos.json.
 */
import type { Evento, Fase } from '../api/evento';
import contenido from '../../../contenido/eventos.json';

export interface Tarifa {
  /** ticket_id de Atonik. null en vista previa: se puede armar el carrito, no pagar. */
  id: string | null;
  /** Llave estable para el carrito (ticket_id, o el nombre en vista previa). */
  clave: string;
  nombre: string;
  /** Texto pequeño bajo el nombre, p. ej. "6 personas". */
  detalle: string | null;
  precio: number;
  incluye: string[];
  destacada: boolean;
  agotada: boolean;
}

export interface Lugar {
  nombre: string | null;
  direccion: string | null;
  /** "Zona T, Bogotá" */
  zona: string | null;
}

export interface EventoVista {
  nombre: string;
  descripcion: string | null;
  lugar: Lugar;
  /** "YYYY-MM-DD HH:MM" */
  fecha: string;
  urlname: string | null;
  eventoId: string | null;
  imagen: string | null;
  tarifas: Tarifa[];
}

export interface EventoAgenda {
  id: string;
  nombre: string;
  fecha: string;
  urlname: string;
  imagen: string | null;
}

/** "Mesa (6 personas)" → { nombre: "Mesa", detalle: "6 personas" } */
function separarDetalle(nombre: string): { nombre: string; detalle: string | null } {
  const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(nombre);
  return match ? { nombre: match[1], detalle: match[2] } : { nombre, detalle: null };
}

/**
 * Tarifas activas de las fases activas. La convención de carga en Atonik
 * (ver contenido/eventos.json) es: description = "incluye" unido con " · ".
 * Sin bandera de destacada en la API, se destaca la del medio cuando hay 3+,
 * como en el diseño original (VIP entre General y Mesa).
 */
export function tarifasDesdeFases(fases: Fase[] | undefined): Tarifa[] {
  const activas = (fases ?? [])
    .filter((fase) => fase.is_active)
    .flatMap((fase) => fase.ticket_types.filter((tipo) => tipo.is_active));

  return activas.map((tipo, indice) => {
    const { nombre, detalle } = separarDetalle(tipo.name);
    return {
      id: tipo.ticket_id,
      clave: tipo.ticket_id,
      nombre,
      detalle,
      precio: tipo.price,
      incluye: (tipo.description ?? '')
        .split(/\s·\s|\n/)
        .map((linea) => linea.trim())
        .filter(Boolean),
      destacada: activas.length >= 3 && indice === 1,
      agotada: tipo.available_stock <= 0,
    };
  });
}

export function eventoVistaDesdeApi(evento: Evento): EventoVista {
  const primeraFecha = evento.dates.dates?.[0];
  const fecha =
    evento.dates.startDate ??
    (primeraFecha ? `${primeraFecha.date} ${primeraFecha.startTime ?? primeraFecha.time ?? ''}`.trim() : '');
  const { place, address, city } = evento.location ?? {};
  return {
    nombre: evento.general.name,
    descripcion: evento.general.description?.trim() || null,
    lugar: { nombre: place || null, direccion: address || null, zona: city || null },
    fecha,
    urlname: evento.general.urlname,
    eventoId: evento._id,
    imagen: evento.design.mainImage ?? null,
    tarifas: tarifasDesdeFases(evento.stages),
  };
}

/** Próximo evento según contenido/eventos.json, para cuando la productora aún no existe en Atonik. */
export function eventoVistaPrevia(): EventoVista | null {
  // Fecha local (no toISOString, que es UTC y en Colombia adelanta el día desde las 7 p. m.).
  const ahora = new Date();
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  const proximos = [...contenido.eventos]
    .filter((evento) => evento.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const evento = proximos[0] ?? contenido.eventos[contenido.eventos.length - 1];
  if (!evento) return null;

  const { lugar } = contenido;
  return {
    nombre: evento.nombre,
    descripcion: evento.descripcion,
    lugar: {
      nombre: lugar.nombre,
      direccion: lugar.direccion,
      zona: [lugar.zona, lugar.ciudad].filter(Boolean).join(', ') || null,
    },
    fecha: `${evento.fecha} ${evento.hora_inicio ?? ''}`.trim(),
    urlname: null,
    eventoId: null,
    imagen: null,
    tarifas: evento.fases.map((fase) => ({
      id: null,
      clave: fase.nombre,
      nombre: fase.nombre,
      detalle: null,
      precio: fase.precio,
      incluye: [],
      destacada: false,
      agotada: false,
    })),
  };
}
