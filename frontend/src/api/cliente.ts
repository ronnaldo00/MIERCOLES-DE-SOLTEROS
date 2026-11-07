/**
 * Cliente HTTP base contra la API pública de Atonik.
 * Sin autenticación: estos endpoints son públicos (ficha de productora, evento).
 */

/**
 * Base de la API. Un `VITE_API_URL` vacío es una elección deliberada, no un
 * olvido: significa "mismo origen", que es como se sirve en producción — el
 * hosting reescribe /producer, /api, /web… al servicio de Cloud Run, así que
 * el navegador nunca hace una petición cross-origin y el CORS no entra en juego.
 * Solo cuando la variable no está definida se cae al backend local.
 */
const baseConfigurada = import.meta.env.VITE_API_URL;

export const API_URL: string =
  baseConfigurada === undefined ? 'http://localhost:8080' : baseConfigurada;

export class ErrorApi extends Error {
  status?: number;

  constructor(mensaje: string, status?: number) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.status = status;
  }
}

export async function obtenerJson<T>(ruta: string): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`);
  } catch {
    throw new ErrorApi('No pudimos conectarnos con el servidor. Revisa tu conexión e intenta de nuevo.');
  }

  if (!respuesta.ok) {
    if (respuesta.status === 404) {
      throw new ErrorApi('No encontramos lo que buscabas.', 404);
    }
    throw new ErrorApi('Algo salió mal al cargar la información. Intenta de nuevo.', respuesta.status);
  }

  try {
    return (await respuesta.json()) as T;
  } catch {
    throw new ErrorApi('La respuesta del servidor no se pudo interpretar.');
  }
}
