import { obtenerJson } from './cliente';

export interface ProductoraResumen {
  _id: string;
  name: string;
  url_name: string;
  description: string;
  logo: string;
  country: string;
  department: string;
  city: string;
  status: string;
  followers_count: number;
  event_count: number;
}

export interface EventoResumen {
  _id: string;
  name: string;
  status: string;
  /** "YYYY-MM-DD HH:MM" o vacío. */
  date: string;
  city: string;
  main_image: string;
  url_name: string;
}

export interface MiembroProductora {
  user_id: string;
  name: string;
  avatar: string;
  role: string;
}

export interface LugarProductora {
  _id: string;
  name: string;
  url_name: string;
  city: string;
  image: string;
}

export interface ProductoraPublica {
  producer: ProductoraResumen;
  upcoming_events: EventoResumen[];
  past_events: EventoResumen[];
  members: MiembroProductora[];
  places: LugarProductora[];
}

export function getProductora(urlName: string): Promise<ProductoraPublica> {
  return obtenerJson<ProductoraPublica>(`/producer/by-url/${urlName}`);
}
