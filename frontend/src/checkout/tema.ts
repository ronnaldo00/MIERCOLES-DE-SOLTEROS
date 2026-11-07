import React, { createContext, useContext } from "react";

/**
 * Contrato de tema del checkout vendorizado.
 *
 * El checkout original (apps/web) tematiza cada pantalla con
 * `event.design.primaryColor`, con un fallback fijo hardcodeado al morado
 * de Atonik ("#5A2BCC"). Aquí ese fallback deja de ser fijo: cuando el
 * evento no trae `primaryColor`, cae al color primario del ORGANIZADOR
 * (Miércoles de Solteros en este sitio), no al de Atonik.
 */
export interface TemaCheckout {
  primario: string;
  acento: string;
  fondo: string;
  superficie: string;
  texto: string;
}

/** Paleta de Miércoles de Solteros — ver we-gather-solteros/contenido/marca.json. */
export const TEMA_POR_DEFECTO: TemaCheckout = {
  primario: "#B0141E",
  acento: "#F7F2EE",
  fondo: "#0B0B0B",
  superficie: "#1E1E1E",
  texto: "#F7F2EE",
};

const TemaCheckoutContext = createContext<TemaCheckout>(TEMA_POR_DEFECTO);

/**
 * Inyección del tema: contexto de React.
 *
 * El sitio del organizador monta esto una sola vez, arriba del router,
 * pasándole el tema resuelto desde contenido/marca.json:
 *
 *   <TemaCheckoutProvider tema={temaDeWeGather}>
 *     <RouterProvider ... />
 *   </TemaCheckoutProvider>
 *
 * Si se omite `tema`, se usa TEMA_POR_DEFECTO (la paleta de la landing) — así
 * que para este organizador ni siquiera hace falta pasar la prop.
 */
export function TemaCheckoutProvider({
  tema = TEMA_POR_DEFECTO,
  children,
}: {
  tema?: TemaCheckout;
  children: React.ReactNode;
}) {
  return React.createElement(TemaCheckoutContext.Provider, { value: tema }, children);
}

/** Hook que cada pantalla del checkout usa para leer el tema activo. */
export function useTemaCheckout(): TemaCheckout {
  return useContext(TemaCheckoutContext);
}

/**
 * Resuelve el color primario a pintar en una pantalla del checkout:
 * 1) el color de marca del evento (event.design.primaryColor / state.primaryColor)
 * 2) si no hay, el primario del tema del organizador (fallback)
 */
export function resolverPrimario(colorEvento: string | undefined | null, tema: TemaCheckout): string {
  return colorEvento || tema.primario;
}

/** Mismo helper que trae cada pantalla del checkout original, centralizado para el tema. */
export function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

/** Oscurece un color hex un `amount` (0-255) por canal — para degradados de botones. */
export function darken(hex: string, amount = 40): string {
  const clean = hex.replace("#", "");
  return (
    "#" +
    (clean.match(/.{2}/g) ?? [])
      .map((c) => Math.max(0, parseInt(c, 16) - amount).toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Rutas locales del checkout dentro del sitio del organizador.
 *
 * apps/web usa /payment/select, /payment/card, /payment/nequi, /payment/pse,
 * /payment/pse/result, /payment/receipt/:transactionId y /event/:urlname/checkout.
 * Aquí viven bajo el mismo origen del micrositio pero con nombres en español.
 * El router del sitio (fuera de esta carpeta) debe declarar cada una de estas
 * rutas apuntando al componente correspondiente — ver README.md.
 */
export const RUTAS_CHECKOUT = {
  eventoCheckout: "/evento/:urlname/checkout",
  pagoSeleccionar: "/pago/seleccionar",
  pagoTarjeta: "/pago/tarjeta",
  pagoNequi: "/pago/nequi",
  pagoPSE: "/pago/pse",
  pagoPSEResultado: "/pago/pse/resultado",
  pagoRecibo: "/pago/recibo/:transactionId",
} as const;

/** Arma la ruta de recibo con el id real de transacción. */
export function rutaRecibo(transactionId: string): string {
  return `/pago/recibo/${transactionId}`;
}
