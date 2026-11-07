import { obtenerJson } from './cliente';

export interface TicketType {
  ticket_id: string;
  name: string;
  price: number;
  available_stock: number;
  is_active: boolean;
  description?: string;
}

export interface Fase {
  name: string;
  ticket_types: TicketType[];
  is_active: boolean;
}

export interface EventoGeneral {
  name: string;
  urlname: string;
  description: string;
}

export interface EventoFecha {
  date: string;
  time?: string;
  startTime?: string;
}

export interface EventoFechas {
  startDate?: string;
  endDate?: string;
  type?: string;
  dates?: EventoFecha[];
}

export interface EventoUbicacion {
  place?: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface EventoDiseno {
  mainImage?: string;
  gallery?: string[];
  primaryColor?: string;
  secondaryColor?: string;
}

/** Ficha completa de un evento, tal como la devuelve GET /api/event/slug/{urlname}. */
export interface Evento {
  _id: string;
  general: EventoGeneral;
  dates: EventoFechas;
  location: EventoUbicacion;
  design: EventoDiseno;
  stages: Fase[];
  status: string;
  producer_id?: string;
  producer_url_name?: string;
  producer_name?: string;
}

export function getEventoPorSlug(urlname: string): Promise<Evento> {
  return obtenerJson<Evento>(`/api/event/slug/${urlname}`);
}
