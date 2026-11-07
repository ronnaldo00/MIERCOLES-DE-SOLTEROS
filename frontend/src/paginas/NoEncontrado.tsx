import { Link } from 'react-router-dom';
import Estado from '../componentes/Estado';

export default function NoEncontrado() {
  return (
    <Estado mensaje="Esta página no existe o ya no está disponible.">
      <Link to="/" className="boton boton-borde">
        Volver al inicio
      </Link>
    </Estado>
  );
}
