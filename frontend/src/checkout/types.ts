export interface CheckoutItem {
  ticket_id?: string;
  stageIdx?: number;
  ticketIdx?: number;
  stageName: string;
  ticketName: string;
  price: number;
  count: number;
}

export type FormFieldType = "email" | "phone" | "text" | "number" | "date" | "select";

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface CheckoutState {
  eventId: string;
  eventName: string;
  eventImage?: string;
  eventSlug?: string;
  primaryColor?: string;
  items: CheckoutItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  totalTickets: number;
  currency: string;
  coupon?: string;
  gateway?: "nequi" | "pse" | "card";
  buyer?: Record<string, string>;
}

export interface WompiPresignedData {
  data?: {
    presigned_acceptance: {
      acceptance_token: string;
      permalink: string;
      type: string;
    };
    presigned_personal_data_auth?: {
      acceptance_token: string;
      permalink: string;
      type: string;
    };
  };
  public_key?: string;
  presigned_acceptance?: {
    acceptance_token: string;
    permalink: string;
    type: string;
  };
  presigned_personal_data_auth?: {
    acceptance_token: string;
    permalink: string;
    type: string;
  };
}

// Cambio local respecto a apps/web: un VITE_API_URL vacío significa "mismo
// origen" (el hosting reescribe las rutas de la API a Cloud Run), no "cae al
// backend local". Ver src/api/cliente.ts y checkout/README.md.
const baseConfigurada = import.meta.env.VITE_API_URL;

export const API_URL: string =
  baseConfigurada === undefined ? "http://localhost:8080" : baseConfigurada;

/**
 * Contrato único de compra: el backend recalcula el precio desde
 * selected_tickets[{ticket_id, quantity}]. El cliente NUNCA envía el precio.
 */
export function toSelectedTickets(
  items: CheckoutItem[]
): { ticket_id: string; quantity: number }[] {
  return items
    .filter((it) => !!it.ticket_id && it.count > 0)
    .map((it) => ({ ticket_id: it.ticket_id as string, quantity: it.count }));
}
