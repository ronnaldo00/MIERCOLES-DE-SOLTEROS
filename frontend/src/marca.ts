/**
 * Tokens, textos y medios de la landing de Miércoles de Solteros (We Gather).
 * Única fuente: ../contenido/marca.json y ../contenido/medios.json. Las
 * variables CSS de src/index.css repiten la paleta porque el CSS no puede
 * importar JSON; si cambia un color, cambia en los dos.
 */
import datos from '../../contenido/marca.json';
import datosMedios from '../../contenido/medios.json';
import organizador from '../../organizador.json';

export interface Manilla {
  color: string;
  tono: string;
  etiqueta: string;
  nota: string;
}

/** Una foto o un video de public/medios/. null = espacio sin llenar todavía. */
export type Medio = {
  tipo: 'imagen' | 'video';
  src: string;
  alt?: string;
  poster?: string;
} | null;

export interface Medios {
  principal: Medio;
  fondo_portada: Medio;
  tira: Medio[];
  carrusel: Medio[];
  galeria: Medio[];
  persona: Medio;
  fondo_noche: Medio;
}

/**
 * Le pone adelante la carpeta donde vive la página. En el computador y en
 * Firebase la página está en la raíz ("/"), pero en GitHub Pages vive en
 * "/MIERCOLES-DE-SOLTEROS/". Vite nos da esa carpeta en BASE_URL.
 * Ej.: "/medios/foto.webp" → "/MIERCOLES-DE-SOLTEROS/medios/foto.webp"
 */
export function conBase(ruta: string): string {
  if (!ruta.startsWith('/')) return ruta; // links completos (https://...) se dejan igual
  return import.meta.env.BASE_URL.replace(/\/$/, '') + ruta;
}

/** Arregla la ruta de una foto/video (y su póster) con conBase. */
function medioConBase(medio: Medio): Medio {
  if (!medio) return medio;
  return { ...medio, src: conBase(medio.src), poster: medio.poster ? conBase(medio.poster) : undefined };
}

const crudos = datosMedios as unknown as Medios;
export const medios: Medios = {
  principal: medioConBase(crudos.principal),
  fondo_portada: medioConBase(crudos.fondo_portada),
  tira: crudos.tira.map(medioConBase),
  carrusel: crudos.carrusel.map(medioConBase),
  galeria: crudos.galeria.map(medioConBase),
  persona: medioConBase(crudos.persona),
  fondo_noche: medioConBase(crudos.fondo_noche),
};

export const marca = {
  nombre: organizador.nombre,
  /** url_name de la productora en Atonik; null mientras no exista. */
  urlName: organizador.atonik.url_name as string | null,
  urlNamePropuesto: organizador.atonik.url_name_propuesto,
  entorno: organizador.atonik.entorno,
  instagram: organizador.instagram as string | null,
  paleta: datos.paleta,
  logoTexto: datos.logo_texto,
  portada: datos.portada,
  presentacion: datos.presentacion,
  deco: datos.deco,
  manillas: datos.manillas as typeof datos.manillas & { opciones: Manilla[] },
  noche: datos.noche,
  cierre: datos.cierre,
};
