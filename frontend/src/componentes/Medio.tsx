import type { Medio as MedioDatos } from '../marca';

/**
 * Pinta un espacio de contenido/medios.json: foto, video (en silencio y en
 * bucle) o, si todavía está en null, un recuadro con su nombre para saber
 * qué archivo falta.
 */
export default function Medio({
  medio,
  nombre,
  className = '',
  prioridad = false,
}: {
  medio: MedioDatos | undefined;
  /** Nombre del espacio, p. ej. "tira 2": se ve solo mientras está vacío. */
  nombre: string;
  className?: string;
  /** La portada carga de una vez; el resto, al acercarse. */
  prioridad?: boolean;
}) {
  if (!medio) {
    return (
      <div className={`medio medio-vacio ${className}`} aria-hidden="true">
        <span>{nombre}</span>
      </div>
    );
  }
  if (medio.tipo === 'video') {
    return (
      <video
        className={`medio ${className}`}
        src={medio.src}
        poster={medio.poster}
        autoPlay
        muted
        loop
        playsInline
        preload={prioridad ? 'auto' : 'metadata'}
        aria-label={medio.alt}
        aria-hidden={medio.alt ? undefined : true}
      />
    );
  }
  return (
    <img
      className={`medio ${className}`}
      src={medio.src}
      alt={medio.alt ?? ''}
      loading={prioridad ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
