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

export const medios = datosMedios as unknown as Medios;

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
