import { useCallback, useEffect, useState } from 'react';
import { getProductora } from '../api/productora';
import { getEventoPorSlug } from '../api/evento';
import { ErrorApi } from '../api/cliente';
import { compararPorFecha } from '../utilidades/fecha';
import {
  eventoVistaDesdeApi,
  eventoVistaPrevia,
  type EventoAgenda,
  type EventoVista,
} from '../datos/cartelera';

/**
 * - 'atonik': la productora existe; eventos, precios y pago son reales (del entorno de VITE_API_URL).
 * - 'vista-previa': la productora todavía no existe en Atonik (404). Se muestra
 *   contenido/eventos.json y el carrito no deja pagar.
 */
export type ModoCartelera = 'atonik' | 'vista-previa';

export type EstadoCartelera =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'listo'; modo: ModoCartelera; proximo: EventoVista | null; agenda: EventoAgenda[] };

export function useCartelera(urlName: string): EstadoCartelera & { reintentar: () => void } {
  const [resultado, setResultado] = useState<EstadoCartelera>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setResultado({ estado: 'cargando' });

    (async () => {
      // En GitHub Pages la API de Atonik no nos deja conectarnos (CORS), así que
      // con VITE_SOLO_VISTA_PREVIA=true mostramos directo los datos de
      // contenido/eventos.json, sin intentar llamar a la API.
      if (import.meta.env.VITE_SOLO_VISTA_PREVIA === 'true') {
        if (!cancelado) setResultado({ estado: 'listo', modo: 'vista-previa', proximo: eventoVistaPrevia(), agenda: [] });
        return;
      }
      try {
        const productora = await getProductora(urlName);
        // La API ordena por created_at, no por fecha del evento.
        const [siguiente, ...resto] = [...productora.upcoming_events].sort((a, b) =>
          compararPorFecha(a.date, b.date),
        );

        let proximo: EventoVista | null = null;
        if (siguiente) {
          try {
            proximo = eventoVistaDesdeApi(await getEventoPorSlug(siguiente.url_name));
          } catch {
            // Sin la ficha no hay precios, pero el evento se anuncia igual.
            proximo = {
              nombre: siguiente.name,
              descripcion: null,
              lugar: { nombre: null, direccion: null, zona: null },
              fecha: siguiente.date,
              urlname: siguiente.url_name,
              eventoId: siguiente._id,
              imagen: siguiente.main_image || null,
              tarifas: [],
            };
          }
        }

        const agenda: EventoAgenda[] = resto.map((evento) => ({
          id: evento._id,
          nombre: evento.name,
          fecha: evento.date,
          urlname: evento.url_name,
          imagen: evento.main_image || null,
        }));

        if (!cancelado) setResultado({ estado: 'listo', modo: 'atonik', proximo, agenda });
      } catch (err) {
        if (cancelado) return;
        if (err instanceof ErrorApi && err.status === 404) {
          setResultado({ estado: 'listo', modo: 'vista-previa', proximo: eventoVistaPrevia(), agenda: [] });
          return;
        }
        setResultado({
          estado: 'error',
          mensaje: err instanceof ErrorApi ? err.message : 'Algo salió mal. Intenta de nuevo.',
        });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [urlName, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return { ...resultado, reintentar };
}

export function useEventoVista(urlname: string) {
  const [resultado, setResultado] = useState<
    { estado: 'cargando' } | { estado: 'error'; mensaje: string } | { estado: 'listo'; evento: EventoVista }
  >({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setResultado({ estado: 'cargando' });
    getEventoPorSlug(urlname)
      .then((evento) => {
        if (!cancelado) setResultado({ estado: 'listo', evento: eventoVistaDesdeApi(evento) });
      })
      .catch((err) => {
        if (cancelado) return;
        setResultado({
          estado: 'error',
          mensaje:
            err instanceof ErrorApi && err.status === 404
              ? 'No encontramos este evento.'
              : err instanceof ErrorApi
                ? err.message
                : 'Algo salió mal. Intenta de nuevo.',
        });
      });
    return () => {
      cancelado = true;
    };
  }, [urlname, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return { ...resultado, reintentar };
}
