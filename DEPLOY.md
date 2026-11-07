# Landing de Miércoles de Solteros (We Gather)

**Estado a hoy (2026-11-06): creada, sin desplegar y sin productora en Atonik.**

Es una carpeta aparte de `we-gather/` (el sitio art déco), a pedido del usuario,
hecha a partir del diseño de `recursos/diseno-original/`. Las dos apuntan a la
misma productora propuesta (`we-gather`).

- **Modo vista previa** (hoy): `GET /producer/by-url/we-gather` responde 404,
  así que la landing muestra `contenido/eventos.json` (cover $30.000, miércoles
  11 de noviembre, 7 p. m., La Casa de la Ranchera) y "Comprar cover" abre un
  diálogo que avisa que el pago todavía no está habilitado.
- **Modo Atonik**: en cuanto la productora exista, el próximo evento sale de la
  API y "Comprar cover" lleva al checkout. Si el evento tiene una sola tarifa,
  entra con 1 cover precargado. Probado con un evento real de testing
  (`/evento/caos-cineclub-get-out`).

## Diseño

Desde el 2026-11-06 la landing sigue la estructura de
`recursos/diseno-original/referencia-estructura.jpg`, un sitio de discoteca
negro y rojo. No se copió su marca. El orden es: encabezado con el logo en
recuadro, portada (texto y video/foto principal), tira de 4 fotos,
presentación, carrusel con tipografía decorativa, manillas, galería de 4 fotos,
tres botones de contorno, banda roja (horario, lugar, persona y próxima noche)
y pie. La versión anterior, amarilla, quedó en `recursos/version-amarilla/`.

Fuentes de Google Fonts: Playfair Display (titulares y textos) y Oswald
(logo y tipografía decorativa).

## Qué sale de dónde

| Parte                                     | Fuente                                   |
|-------------------------------------------|------------------------------------------|
| Nombre, fecha, hora, precio               | API de Atonik, o `contenido/eventos.json` |
| Lugar (nombre, dirección, zona)           | `location` del evento, o `eventos.json`  |
| Textos (lema, presentación, decorativo, manillas, preguntas) | `contenido/marca.json` |
| **Fotos y videos**                        | `contenido/medios.json` → archivos en `frontend/public/medios/` |

### Fotos y videos

Cada espacio de la página es una entrada de `contenido/medios.json`
(`principal`, `fondo_portada`, `tira` ×4, `carrusel` ×n, `galeria` ×4,
`persona`, `fondo_noche`). Las instrucciones están al principio de ese
archivo. Un espacio en `null` se ve como un recuadro rayado con su nombre.
Los videos se reproducen solos, en silencio y en bucle. Para `persona`
conviene una foto recortada (PNG sin fondo) o un video con fondo oscuro.

## Crear el evento en Atonik

1. Crear la productora con `url_name` **`we-gather`** (o cambiar
   `VITE_PRODUCER_URLNAME` en `frontend/.env.production`).
2. Crear el lugar La Casa de la Ranchera, Calle 83 #14-31, Bogotá.
   Confirmar la dirección con el organizador.
3. Crear **Miércoles de Solteros** con un solo `ticket_type` "Cover" de $30.000.
   Llenar la descripción del evento: es el texto de la portada.
4. Dejar `design.primaryColor` vacío o en `#B0141E` (el rojo de la landing).
   El checkout pinta sus botones con ese color y texto blanco.
5. Pasar los ids reales a `organizador.json` y `contenido/eventos.json`.

## Firebase Hosting

Target `we-gather-solteros` → sitio `we-gather-solteros`, con los mismos
rewrites a `atonik-flask-test` que Caos y We Gather.

```sh
cd we-gather-solteros/frontend
firebase hosting:sites:create we-gather-solteros --project atonik-proyect
firebase target:apply hosting we-gather-solteros we-gather-solteros --project atonik-proyect
pnpm install && pnpm build
firebase deploy --only hosting:we-gather-solteros --project atonik-proyect
```

## Desarrollo local

```sh
cd we-gather-solteros/frontend
pnpm install
pnpm dev --port 5173
```

Hay que usar el puerto 5173, porque el CORS de testing solo acepta ese. Por eso
no se puede tener al mismo tiempo esta landing, `we-gather/` y `caos/` contra testing.

## Pendientes conocidos

- `tsc` reporta los mismos 3 errores del checkout vendorizado que Caos y We Gather.
- Es la **tercera** copia del checkout: ver `src/checkout/README.md`.
