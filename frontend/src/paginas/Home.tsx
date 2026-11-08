import { useCartelera } from '../hooks/useCartelera';
import { marca } from '../marca';
import Landing from '../componentes/Landing';
import Estado from '../componentes/Estado';
import Compuerta from '../componentes/Compuerta';

const URL_NAME: string = import.meta.env.VITE_PRODUCER_URLNAME || marca.urlName || marca.urlNamePropuesto;

export default function Home() {
  const cartelera = useCartelera(URL_NAME);
  return (
    <>
      <Contenido cartelera={cartelera} />
      {/* Compuerta de entrada: tapa la carga y se abre (arriba/abajo) cuando todo está listo */}
      <Compuerta lista={cartelera.estado !== 'cargando'} />
    </>
  );
}

function Contenido({ cartelera }: { cartelera: ReturnType<typeof useCartelera> }) {
  if (cartelera.estado === 'cargando') return <Estado mensaje="Preparando la pista…" />;
  if (cartelera.estado === 'error') {
    return (
      <Estado mensaje={cartelera.mensaje}>
        <button type="button" className="boton boton-borde" onClick={cartelera.reintentar}>
          Reintentar
        </button>
      </Estado>
    );
  }
  if (!cartelera.proximo) {
    return <Estado mensaje="Pronto anunciamos la próxima edición de Miércoles de Solteros." />;
  }
  return <Landing evento={cartelera.proximo} modo={cartelera.modo} agenda={cartelera.agenda} />;
}
