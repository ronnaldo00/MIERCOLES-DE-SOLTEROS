// Barrel del checkout vendorizado. Ver README.md para el origen, los cambios
// locales y cómo re-sincronizar contra apps/web.

// Páginas — una por ruta. El router del sitio las monta contra RUTAS_CHECKOUT.
export { default as EventCheckout } from "./EventCheckout";
export { default as PaymentSelect } from "./PaymentSelect";
export { default as PaymentCard } from "./Card";
export { default as PaymentNequi } from "./Nequi";
export { default as PaymentPSE } from "./PSE";
export { default as PSEResult } from "./PSEResult";
export { default as Receipt } from "./Receipt";

// Tema: contrato, provider, hook y rutas — lo que el sitio necesita para
// inyectar la marca del organizador y declarar el router.
export {
  TEMA_POR_DEFECTO,
  TemaCheckoutProvider,
  useTemaCheckout,
  resolverPrimario,
  hexToRgb,
  darken,
  RUTAS_CHECKOUT,
  rutaRecibo,
  type TemaCheckout,
} from "./tema";

// Tipos del contrato de compra, por si el sitio necesita referenciarlos
// (por ejemplo para armar el CheckoutState al enlazar desde una tarjeta de evento).
export type { CheckoutItem, CheckoutState, FormField, FormFieldType, WompiPresignedData } from "./types";
export { API_URL, toSelectedTickets } from "./types";
