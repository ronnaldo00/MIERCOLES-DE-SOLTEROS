import { useParams } from 'react-router-dom';
import { useEventoVista } from '../hooks/useCartelera';
import Landing from '../componentes/Landing';
import Estado from '../componentes/Estado';

/** Landing de una fecha concreta, la que enlaza "Más fechas". */
export default function Evento() {
  const { urlname = '' } = useParams<{ urlname: string }>();
  const resultado = useEventoVista(urlname);

  if (resultado.estado === 'cargando') return <Estado mensaje="Preparando la pista…" />;
  if (resultado.estado === 'error') {
    return (
      <Estado mensaje={resultado.mensaje}>
        <button type="button" className="boton boton-borde" onClick={resultado.reintentar}>
          Reintentar
        </button>
      </Estado>
    );
  }
  return <Landing evento={resultado.evento} modo="atonik" />;
}
