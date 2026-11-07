import type { ReactNode } from 'react';
import { Encabezado, Pie } from './Landing';

/** Página de mensaje (cargando, error, 404) con el encabezado y el pie de la landing. */
export default function Estado({ mensaje, children }: { mensaje: string; children?: ReactNode }) {
  return (
    <div className="sitio">
      <Encabezado />
      <main className="estado envoltura" role="status">
        <img className="estado-logo" src="/img/logo.webp" alt="" />
        <p>{mensaje}</p>
        {children}
      </main>
      <Pie />
    </div>
  );
}
