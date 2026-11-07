# Checkout de Miércoles de Solteros (We Gather) — copia vendorizada

> **Tercera copia.** Se copió tal cual de `we-gather/frontend/src/checkout/` (que a su vez viene de `caos/`) el 2026-11-06, al crear la landing de `we-gather-solteros/`. El único cambio es la paleta por defecto de `tema.ts` (rojo, negro y blanco de la landing). Todo lo de abajo describe la copia original hecha para Caos y aplica igual aquí. Con tres copias ya se cumplió la advertencia: el siguiente cambio al checkout debería ir a una extracción en `packages/checkout`, no a tres parches iguales.

Este checkout **no es un paquete compartido**. Es una copia (vendorización) del
checkout que ya funciona en `apps/web`, pegada dentro del sitio de Caos.

## Por qué una copia y no un paquete

Decisión consciente del usuario para esta entrega: extraer un `packages/checkout`
compartido implicaba tocar `apps/web` (mover código, cambiar imports, coordinar
un release) y este trabajo tenía que hacerse sin tocar `apps/web` en absoluto —
hay otro agente trabajando en paralelo sobre ese árbol. Copiar es más simple y
más seguro para esta entrega, a costa de que un fix en `apps/web` no se
propaga solo aquí.

La advertencia queda registrada: **al tercer organizador que necesite este
checkout, esto se extrae a `packages/checkout` de verdad.** Mantener N copias
vendorizadas a mano deja de ser razonable a partir de ahí.

## Origen exacto

Commit del monorepo en el momento de copiar: **`8a42aa5`**
("feat(mobile): bloquea el arranque hasta correr la ultima OTA").

| Archivo en `apps/web/src/`                  | Archivo aquí          |
|----------------------------------------------|------------------------|
| `routes/Event/EventCheckout.tsx`              | `EventCheckout.tsx`    |
| `routes/Payment/PaymentSelect.tsx`            | `PaymentSelect.tsx`    |
| `routes/Payment/Card.tsx`                     | `Card.tsx`             |
| `routes/Payment/Nequi.tsx`                    | `Nequi.tsx`            |
| `routes/Payment/PSE.tsx`                      | `PSE.tsx`              |
| `routes/Payment/PSEResult.tsx`                | `PSEResult.tsx`        |
| `routes/Payment/Receipt.tsx`                  | `Receipt.tsx`          |
| `routes/Payment/PaymentSummary.tsx`           | `PaymentSummary.tsx`   |
| `routes/Payment/types.ts`                     | `types.ts`             |

No se copiaron `routes/Event/Event.tsx` ni `routes/Event/backup.tsx` (fuera de
alcance de esta tarea).

No hicieron falta más archivos de `apps/web/src` — revisé los imports de los
nueve archivos de arriba y ninguno trae nada de `src/config`, `src/utils`,
`src/constants` ni similares. Cada archivo se basta con React, `react-router-dom`
y sus vecinos dentro de `routes/Event`/`routes/Payment`. Tampoco hay uso de MUI
en ninguno de los nueve — todo es CSS-in-JS con `style={{}}` (EventCheckout,
PaymentSelect, PSE, PSEResult) o Tailwind puro (Card, Nequi, Receipt,
PaymentSummary).

## Estructura

`routes/Event` y `routes/Payment` quedaron aplanados en esta única carpeta.
Los imports relativos que cruzaban de una a otra (`../Payment/types`) ahora
apuntan a `./types` porque todo vive junto.

Se agregó `tema.ts`, que no existe en el original — es el contrato de tema
descrito abajo.

## Cambios locales — archivo por archivo

### `tema.ts` (nuevo, no existe en apps/web)
Contrato de tema del checkout: interfaz `TemaCheckout`, la paleta de Caos como
default, un `React.Context` + `TemaCheckoutProvider` + hook `useTemaCheckout()`
para inyectarlo, el resolver `resolverPrimario(colorEvento, tema)` que
implementa el fallback de la marca (ver más abajo), los helpers `hexToRgb` /
`darken` (mismo código que ya traía `EventCheckout.tsx` original, sólo que acá
centralizados para que las pantallas que antes no tematizaban nada puedan
usarlos), y `RUTAS_CHECKOUT` / `rutaRecibo()` con las rutas locales en español.

### `types.ts`
Sin cambios de lógica. `API_URL` ya resolvía exactamente como pedía la tarea:
`import.meta.env.VITE_API_URL || "http://localhost:8080"` — no hizo falta
tocarlo.

### `EventCheckout.tsx`
- Import `../Payment/types` → `./types`; se agregó import de `./tema`.
- `const primary = event?.design?.primaryColor ?? "#5A2BCC"` (fallback fijo al
  morado de Atonik) → `resolverPrimario(event?.design?.primaryColor, tema)`
  (fallback al primario del organizador).
- Los tres `background: "#0B0C14"` (loading, error, contenedor principal) y los
  fondos translúcidos del header/footer sticky (`rgba(11,12,20,0.96/.97)`)
  ahora usan `tema.fondo` / `rgba(${fondoRgb},...)`.
- `navigate("/payment/select", { state })` → `navigate(RUTAS_CHECKOUT.pagoSeleccionar, { state })`.
- El `import("../Payment/types").CheckoutItem` inline (tipo dentro de
  `handleContinue`) → `import("./types").CheckoutItem`.
- Todo lo demás — validación de comprador, cupón, cálculo de subtotal/total,
  manejo de qty por etapa/ticket — idéntico.

### `PaymentSelect.tsx`
- Import `./types` (ya era relativo a la misma carpeta, sin cambio de ruta) +
  import de `./tema`.
- Mismo cambio de fallback de color que EventCheckout.
- Fondos sticky header/footer: mismo tratamiento con `tema.fondo`.
- `navigate("/payment/pse", ...)` → `navigate(RUTAS_CHECKOUT.pagoPSE, ...)`.
- `navigate("/payment/nequi", ...)` → `navigate(RUTAS_CHECKOUT.pagoNequi, ...)`.
- Lógica de selección de método, checkboxes de términos/privacidad, fetch de
  `presigned_acceptance`: idéntica.

### `PSE.tsx`
- Mismo cambio de fallback de color y de fondos sticky.
- `redirectUrl` que se manda al backend (`${origin}/payment/pse/result`) →
  `${origin}/pago/pse/resultado`, para que coincida con la ruta local nueva.
  **Importante para el otro agente:** esta URL viaja al backend de Wompi/Atonik
  como `redirect_url`; el banco redirige de vuelta ahí después del pago, así
  que la ruta `/pago/pse/resultado` tiene que existir en el router del sitio
  apuntando a `PSEResult`.
- Selector de banco, validación de documento/nombre/email, submit a
  `/web/wompi/pse/make_payment`: idéntico.

### `PSEResult.tsx`
- Esta pantalla se llega por redirect del banco (query param `?id=`), nunca
  trae `CheckoutState` en `location.state` — por eso el original nunca tuvo
  `primaryColor` disponible y hardcodeaba morado en todas partes. Acá usa
  directamente `tema.primario` (no hay evento del que leer un color).
- Reemplacé los hex fijos de marca (`#7c3aed`, `#5b21b6`, `#a78bfa`,
  `#1d1f3d`/`#121327`) por `tema.primario` / `tema.acento` / `tema.superficie`
  vía `rgb`. El verde/rojo de estado (aprobado/rechazado) NO se tocó — es
  semántica de estado, no de marca.
- Fondo de página: `tema.fondo`.
- El resto (polling de estado, copiar código, todo el flujo) es idéntico.
- **Nota sobre enlaces que quedan igual, ver sección de abajo:** el botón
  "Ya tengo la app — canjear ahora" (`href="/activate?codes=..."`) y
  `STEPS_URL` (`https://atonik.co/steps-activation-code`).

### `Receipt.tsx`
- El original no tematizaba nada — todo hardcodeado a la paleta morada fija de
  Atonik (`#0B0C14`, `#7c3aed`, `#a78bfa`, etc.), aun teniendo `passed.primaryColor`
  disponible en `location.state`. Ahora usa `resolverPrimario(passed?.primaryColor, tema)`
  y pinta con eso: fondo de página, spinner, borde/fondo de las tarjetas de
  código, color del código de activación (acento), botón de copiar, botón de
  Google Play.
- El botón de App Store se dejó blanco (como el original) con el texto en
  `tema.fondo` en vez de un negro fijo, para que siga siendo legible sobre
  cualquier fondo.
- Resto (fetch de transacción + códigos, formateo de moneda, tabla de resumen):
  idéntico.

### `Card.tsx`
- El original tampoco tematizaba nada (Tailwind con morado fijo `#7040E0` /
  `#4020A0` / `#1a0a2a` / `#402080`, sin leer `state.primaryColor`). Se agregó
  `resolverPrimario(state?.primaryColor, tema)` y se repintó con eso: el
  degradado de la tarjeta visual, el borde de los inputs, el color de los
  checkboxes (`accentColor`) y sus links, el botón de submit y su estado
  deshabilitado, y el overlay de procesamiento.
- Varias clases Tailwind con color arbitrario (`bg-[#7040E0]`, `accent-[#7040E0]`,
  `text-[#7040F0]`, etc.) se movieron a `style={{}}` porque Tailwind no puede
  generar clases con un color que sólo se conoce en runtime (el color del
  evento/organizador). Las clases de layout/espaciado (`rounded-xl`, `py-4`,
  `grid`, etc.) se dejaron intactas.
- `navigate('/payment/receipt/${txId}', ...)` → `navigate(rutaRecibo(txId), ...)`.
- Tokenización con Wompi, polling de estado, armado del payload de
  `/web/wompi/transactions`: idéntico, incluyendo el comentario original sobre
  cómo se deriva `wompiTokensUrl` del entorno de la public key.

### `Nequi.tsx`
- **A propósito NO se tematizó el rosa de Nequi** (`#DB0082`/`pink-500`/`pink-600`
  en la tarjeta de resumen y el botón de confirmar). Es la marca de un tercero
  (Nequi), no la marca de Atonik ni la del organizador — cambiarla a rojo/Caos
  confundiría al usuario sobre qué app va a recibir la notificación de pago.
  Queda anotado en un comentario dentro del archivo.
- Sí se tematizó lo que es "chrome" del checkout, no de Nequi: el fondo de
  página (`tema.fondo`) y el overlay de procesamiento/éxito.
- `navigate('/payment/receipt/${txId}', ...)` → `navigate(rutaRecibo(txId), ...)`
  (dos ocurrencias: pago con Nequi y reserva de evento gratis).
- Lógica de reserva gratis, `toSelectedTickets`, polling de `/web/nequi/check/:id`,
  `make_payment`: idéntica.

### `PaymentSummary.tsx`
- Igual que Card/Receipt: no tematizaba nada (morado fijo). Ahora usa
  `resolverPrimario(state.primaryColor, tema)` para el borde de la tarjeta, el
  label "Evento", los separadores y los puntos de progreso.
- Estructura (imagen del evento, lista de items, subtotal/tarifa/total, barra
  de pasos) idéntica.

## Fallback de color — cómo funciona

Contrato: `resolverPrimario(colorEvento, tema) = colorEvento || tema.primario`.

- Si el evento trae `design.primaryColor` (EventCheckout, PaymentSelect, PSE) o
  `CheckoutState.primaryColor` (Card, Nequi, Receipt, PaymentSummary), se usa
  ese color — es la marca del evento, tiene prioridad.
- Si no lo trae, cae al `tema.primario` del organizador (rojo `#E1231E` de
  Caos por defecto).
- Aplica en las **siete** pantallas, no sólo en EventCheckout — ese era el
  requisito. En el checkout original de apps/web, Card/Nequi/Receipt/PaymentSummary
  NUNCA leían `primaryColor` (estaban hardcodeadas al morado de Atonik); acá sí
  lo leen, con el mismo fallback.
- Excepción documentada: `PSEResult.tsx` no tiene acceso a `CheckoutState`
  (llega por redirect del banco, no por navegación interna con `state`), así
  que usa `tema.primario` directo — no hay color de evento que priorizar.
- Excepción documentada: `Nequi.tsx` mantiene el rosa de Nequi fijo en los
  elementos que son específicamente de la marca Nequi (ver arriba).

## Cómo se inyecta el tema

Contexto de React. El sitio monta el provider una sola vez, arriba del router:

```tsx
import { TemaCheckoutProvider } from "./checkout";
// o: import { TemaCheckoutProvider } from "./checkout/tema";

<TemaCheckoutProvider tema={temaDeCaos}>
  <RouterProvider router={router} />
</TemaCheckoutProvider>
```

`tema` es opcional — si se omite, usa `TEMA_POR_DEFECTO` (que ya es la paleta
de Caos), así que para este organizador ni hace falta pasar la prop. Cuando el
sitio quiera leer la paleta desde `contenido/marca.json` en vez del default
hardcodeado, arma un objeto `TemaCheckout` con esos valores y lo pasa ahí.

## Rutas que debe declarar el router del sitio

Import: `RUTAS_CHECKOUT` desde `./checkout` (o `./checkout/tema`).

| Constante                          | Ruta                            | Componente          |
|-------------------------------------|----------------------------------|----------------------|
| `RUTAS_CHECKOUT.eventoCheckout`     | `/evento/:urlname/checkout`      | `EventCheckout`      |
| `RUTAS_CHECKOUT.pagoSeleccionar`    | `/pago/seleccionar`              | `PaymentSelect`      |
| `RUTAS_CHECKOUT.pagoTarjeta`        | `/pago/tarjeta`                  | `PaymentCard`        |
| `RUTAS_CHECKOUT.pagoNequi`          | `/pago/nequi`                    | `PaymentNequi`       |
| `RUTAS_CHECKOUT.pagoPSE`            | `/pago/pse`                      | `PaymentPSE`         |
| `RUTAS_CHECKOUT.pagoPSEResultado`   | `/pago/pse/resultado`            | `PSEResult`          |
| `RUTAS_CHECKOUT.pagoRecibo`         | `/pago/recibo/:transactionId`    | `Receipt`            |

`PaymentCard` (`/pago/tarjeta`) existe como pantalla y como ruta en apps/web,
pero **`PaymentSelect` no la ofrece como opción** — su lista de métodos sólo
tiene Nequi y PSE (así es en el original también, no es un bug de la copia).
Queda disponible por si el sitio quiere enlazarla desde otro lado.

Todas las páginas se importan desde `./checkout` (el barrel en `index.ts`) o
directo desde su archivo — ambas formas funcionan.

## Enlaces que quedan fuera de este sitio (a propósito, no se borraron)

Regla de la tarea: si algo enlaza a una pantalla que no existe en este sitio,
se deja funcionando en modo degradado y se anota acá, no se borra en
silencio.

1. **`/activate?codes=...`** en `PSEResult.tsx` (botón "Ya tengo la app —
   canjear ahora"). Es una ruta interna de `apps/web` que no existe en el
   sitio de Caos. El link queda tal cual — al hacer click hoy da 404 en este
   sitio. Queda pendiente hasta que el organizador decida si quiere:
   (a) replicar esa pantalla acá, (b) redirigir a atonik.co, o (c) quitar el
   botón. `Receipt.tsx` no tiene este botón en el original, así que no aplica
   ahí.

2. **`STEPS_URL = "https://atonik.co/steps-activation-code"`** en
   `PSEResult.tsx` y `Receipt.tsx`. Es un link absoluto a atonik.co — en
   principio contra la regla de "nada de rutas absolutas a atonik.co salvo la
   API". Se dejó a propósito: es una página de ayuda (cómo activar el código
   en la app), sin equivalente en este sitio, y funciona igual sin importar
   qué organizador la enlace — no es contenido específico de Atonik-la-empresa
   que compita con el sitio del organizador. Si se quiere eliminar la
   dependencia por completo, hay que escribir esa guía en algún lado del sitio
   de Caos y cambiar la constante.

3. Los links a Play Store / App Store (`PLAY_STORE_URL`, `APP_STORE_URL`) son
   externos a tiendas de apps, no a atonik.co — no aplica la regla, se dejan
   igual.

## Cómo re-sincronizar contra apps/web

Para ver qué cambió río arriba desde que se hizo esta copia:

```sh
git log 8a42aa5..HEAD -- apps/web/src/routes/Event/EventCheckout.tsx apps/web/src/routes/Payment/
```

Si hay commits, hay que revisar cada uno y decidir si aplica también acá — a
mano, comparando contra la tabla de "Cambios locales" de arriba para no pisar
las adaptaciones de tema/rutas ya hechas.
