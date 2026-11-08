import { conBase } from '../marca';
import { useEffect, useState } from 'react';

/**
 * Compuerta de entrada: tapa la pantalla mientras la página carga y, cuando
 * todo está listo, se abre como una compuerta: la mitad de arriba sube y la
 * de abajo baja. El logo queda justo en la unión, así que se parte en dos.
 *
 * - `lista`: true cuando la página ya tiene lo que necesita para mostrarse.
 * - Se queda cerrada al menos MINIMO_CERRADA ms, para que la apertura se vea
 *   aunque la página cargue muy rápido.
 * - Cuando termina de abrirse se quita del todo (no estorba los clics).
 */
const MINIMO_CERRADA = 900;   // ms
const DURACION_APERTURA = 1300; // ms (igual que en el CSS)

export default function Compuerta({ lista }: { lista: boolean }) {
  const [minimoCumplido, setMinimoCumplido] = useState(false);
  const [quitada, setQuitada] = useState(false);
  const abierta = lista && minimoCumplido;

  // Tiempo mínimo cerrada
  useEffect(() => {
    const id = window.setTimeout(() => setMinimoCumplido(true), MINIMO_CERRADA);
    return () => window.clearTimeout(id);
  }, []);

  // Mientras está cerrada no se puede bajar por la página
  useEffect(() => {
    if (quitada) return;
    const anterior = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = anterior;
    };
  }, [quitada]);

  // Cuando termina de abrirse, la quitamos
  useEffect(() => {
    if (!abierta) return;
    const id = window.setTimeout(() => setQuitada(true), DURACION_APERTURA + 100);
    return () => window.clearTimeout(id);
  }, [abierta]);

  if (quitada) return null;

  // Lo que va en la unión (logo + texto). Se dibuja en las dos mitades:
  // cada mitad muestra solo su parte, así el logo se "parte" al abrir.
  const centro = (
    <div className="compuerta-centro">
      <img className="compuerta-logo" src={conBase("/img/logo.webp")} alt="" />
      <p className="compuerta-texto">Preparando la pista…</p>
    </div>
  );

  return (
    <div className="compuerta" data-abierta={abierta} role="status" aria-live="polite">
      <span className="sr-only">{abierta ? 'Listo' : 'Preparando la pista…'}</span>
      <div className="compuerta-mitad compuerta-arriba" aria-hidden="true">
        {centro}
      </div>
      <div className="compuerta-mitad compuerta-abajo" aria-hidden="true">
        {centro}
      </div>
      {/* Línea de luz en la unión */}
      <div className="compuerta-rendija" aria-hidden="true" />
    </div>
  );
}
