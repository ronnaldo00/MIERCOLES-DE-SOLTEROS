import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { marca } from '../marca';
import type { EventoAgenda, EventoVista, Lugar } from '../datos/cartelera';
import type { ModoCartelera } from '../hooks/useCartelera';
import { useCompra, type Compra } from '../hooks/useCompra';
import { formatearFechaCorta, partesFecha } from '../utilidades/fecha';
import { iniciarAnimacionesScroll } from '../animaciones/scroll';
import { precioConMoneda, precioCorto } from '../utilidades/precio';

/**
 * Marca un elemento para que entre al aparecer en pantalla (ver animaciones/scroll.ts).
 * `tipo` elige la entrada en index.css: '' sube, 'derecha', 'mascara', 'sticker'.
 */
function revelar(retraso = 0, tipo = '', estilo: CSSProperties = {}) {
  return { 'data-revelar': tipo, style: { ...estilo, '--retraso': `${retraso}ms` } as CSSProperties };
}

/** Título que sube línea por línea desde una máscara. */
function TituloMascara({ lineas, retraso = 0 }: { lineas: ReactNode[]; retraso?: number }) {
  return (
    <>
      {lineas.map((linea, i) => (
        <span key={i} className="mascara" {...revelar(retraso + i * 110, 'mascara')}>
          <span className="mascara-texto">{linea}</span>
        </span>
      ))}
    </>
  );
}

const Flecha = () => (
  <span className="flecha" aria-hidden="true">
    →
  </span>
);

/** Texto del botón de compra: "Comprar cover · $30.000", "desde" si hay varios precios, o "Agotado". */
function textoCompra(compra: Compra, conPrecio: boolean): string {
  if (compra.agotado) return 'Agotado';
  if (!conPrecio || compra.precioDesde === null) return marca.portada.cta;
  return `${marca.portada.cta} · ${compra.variosPrecios ? 'desde ' : ''}${precioCorto(compra.precioDesde)}`;
}

function BotonCompra({
  compra,
  conPrecio = false,
  className = '',
  id,
}: {
  compra: Compra;
  conPrecio?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <button type="button" id={id} className={`boton ${className}`} onClick={compra.comprar} disabled={compra.agotado}>
      {textoCompra(compra, conPrecio)}
      {compra.agotado ? null : <Flecha />}
    </button>
  );
}

function AvisoPrueba({ modo }: { modo: ModoCartelera }) {
  if (modo === 'atonik' && marca.entorno !== 'testing') return null;
  return (
    <div className="aviso-prueba" role="note">
      <strong>Versión de prueba</strong> ·{' '}
      {modo === 'vista-previa'
        ? 'El evento todavía no está en Atonik: aún no se pueden comprar covers.'
        : 'Las compras se hacen en el entorno de pruebas de Atonik.'}
    </div>
  );
}

export function Encabezado({ compra }: { compra?: Compra }) {
  return (
    <header className="encabezado envoltura">
      <div className="nav caja">
        <Link className="marca" to="/" aria-label={`${marca.nombre}, inicio`}>
          <img src="/img/logo.webp" alt="" width="40" height="40" />
          <b>{marca.nombre.toUpperCase()}</b>
        </Link>
        {compra ? (
          <nav className="nav-derecha" aria-label="Secciones">
            <a href="#manillas">Las manillas</a>
            <a href="#fecha">Fecha y lugar</a>
            <BotonCompra compra={compra} className="boton-nav" />
          </nav>
        ) : null}
      </div>
    </header>
  );
}

/** "Miércoles de Solteros" → "Miércoles" + "de Solteros" resaltado en amarillo. */
function partirTitulo(nombre: string): [string, string] {
  if (nombre.trim().toLowerCase() === `${marca.portada.titulo} ${marca.portada.titulo_resaltado}`.toLowerCase()) {
    return [marca.portada.titulo, marca.portada.titulo_resaltado];
  }
  const espacio = nombre.indexOf(' ');
  return espacio > 0 ? [nombre.slice(0, espacio), nombre.slice(espacio + 1)] : [nombre, ''];
}

function Portada({ evento, compra }: { evento: EventoVista; compra: Compra }) {
  const [titulo, resaltado] = partirTitulo(evento.nombre);
  const fecha = partesFecha(evento.fecha);
  const lugar = [evento.lugar.nombre, evento.lugar.zona].filter(Boolean).join(' · ');
  return (
    <section className="portada envoltura" aria-labelledby="titulo">
      <img className="portada-foto" src="/img/portada-solteros.webp" alt="" />
      <div className="portada-texto caja">
        <p className="antetitulo portada-antetitulo" {...revelar(100)}>
          <span className="chispa" aria-hidden="true">
            ✦
          </span>{' '}
          {marca.portada.antetitulo}
        </p>
        <h1 id="titulo">
          <TituloMascara
            lineas={[titulo, ...(resaltado ? [<span className="resaltado">{resaltado}</span>] : [])]}
            retraso={200}
          />
        </h1>
        {evento.descripcion ? (
          <p className="portada-descripcion" {...revelar(520)}>
            {evento.descripcion}
          </p>
        ) : null}
        <p className="portada-fecha antetitulo" {...revelar(620)}>
          {fecha ? (
            <>
              {fecha.diaSemana} {fecha.diaMes}
              {fecha.hora ? (
                <>
                  {' '}
                  <span aria-hidden="true">·</span> {fecha.hora}
                </>
              ) : null}
            </>
          ) : (
            'Fecha por confirmar'
          )}
        </p>
        <div className="portada-accion" {...revelar(720)}>
          <BotonCompra compra={compra} conPrecio id="comprar-portada" />
        </div>
        {lugar ? (
          <p className="portada-lugar" {...revelar(820)}>
            {lugar}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Cinta() {
  // Cuatro copias seguidas: la animación corre la mitad del ancho (dos copias) y
  // el scroll arrastra en módulos de una copia; ninguno de los dos deja salto.
  const frases = [...marca.cinta, ...marca.cinta, ...marca.cinta, ...marca.cinta];
  return (
    <div className="cinta" aria-hidden="true">
      <div className="cinta-arrastre">
      <div className="cinta-linea">
        {frases.map((frase, i) => (
          <span key={i}>
            <span className="cinta-frase">{frase}</span>
            <b>✦</b>
          </span>
        ))}
      </div>
      </div>
    </div>
  );
}

function Manillas() {
  const { manillas } = marca;
  const [elegida, setElegida] = useState(0);
  const actual = manillas.opciones[elegida];
  return (
    <section className="manillas envoltura" id="manillas" aria-labelledby="titulo-manillas">
      <div className="caja">
        <div className="manillas-cabeza">
          <div>
            <span className="antetitulo numero-seccion" {...revelar()}>
              {manillas.antetitulo}
            </span>
            <h2 id="titulo-manillas">
              <TituloMascara lineas={[manillas.titulo]} retraso={80} />
            </h2>
          </div>
          <p className="suave" {...revelar(250)}>
            {manillas.intro}
          </p>
        </div>
        <div className="manillas-grilla" role="group" aria-label="Elige una manilla">
          {manillas.opciones.map((manilla, i) => (
            <button
              key={manilla.color}
              type="button"
              className="manilla"
              {...revelar(150 + i * 140, 'sticker', { '--tono': manilla.tono } as CSSProperties)}
              aria-pressed={i === elegida}
              onClick={() => setElegida(i)}
            >
              <span className="manilla-cabeza">
                <small>
                  {String(i + 1).padStart(2, '0')} / {manilla.color.toUpperCase()}
                </small>
                <span className="indicador" aria-hidden="true" />
              </span>
              <span className="manilla-etiqueta">{manilla.etiqueta}</span>
            </button>
          ))}
        </div>
        <p
          className="manilla-nota"
          role="status"
          {...revelar(600, '', { '--tono': actual.tono } as CSSProperties)}
        >
          {actual.nota}
        </p>
      </div>
    </section>
  );
}

function enlaceMapa(lugar: Lugar): string | null {
  const destino = [lugar.nombre, lugar.direccion, lugar.zona].filter(Boolean).join(', ');
  return destino ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}` : null;
}

function Detalles({ evento, compra }: { evento: EventoVista; compra: Compra }) {
  const { detalles } = marca;
  const fecha = partesFecha(evento.fecha);
  const mapa = enlaceMapa(evento.lugar);
  const ciudad = evento.lugar.zona?.split(',').pop()?.trim();
  const filas: [string, ReactNode][] = [
    ['Fecha', fecha?.diaMes ?? 'Por confirmar'],
    ['Hora', fecha?.hora ? `Desde las ${fecha.hora}` : 'Por confirmar'],
    [
      'Lugar',
      evento.lugar.nombre || evento.lugar.direccion ? (
        <>
          {evento.lugar.nombre}
          {evento.lugar.nombre && evento.lugar.direccion ? <br /> : null}
          {evento.lugar.direccion}
        </>
      ) : (
        'Por confirmar'
      ),
    ],
    [
      'Cover',
      compra.agotado
        ? 'Agotado'
        : compra.precioDesde !== null
          ? `${compra.variosPrecios ? 'Desde ' : ''}${precioConMoneda(compra.precioDesde)}`
          : 'Por confirmar',
    ],
  ];

  return (
    <section className="detalles envoltura" id="fecha" aria-labelledby="titulo-evento">
      <div className="caja">
        <div className="detalles-grilla">
          <div>
            <span className="antetitulo numero-seccion" {...revelar()}>
              {detalles.antetitulo}
            </span>
            <h2 id="titulo-evento">
              <TituloMascara lineas={detalles.titulo.split('\n')} retraso={80} />
            </h2>
            <p className="suave" {...revelar(300)}>
              {detalles.texto}
            </p>
            {mapa ? (
              <div className="detalles-accion" {...revelar(400)}>
                <a className="boton boton-borde" href={mapa} target="_blank" rel="noopener noreferrer">
                  Cómo llegar <Flecha />
                </a>
              </div>
            ) : null}
          </div>
          <div className="ficha" {...revelar(150, 'derecha')}>
            <p className="antetitulo">Próxima edición{ciudad ? ` · ${ciudad}` : ''}</p>
            <h3>{evento.nombre}</h3>
            <dl>
              {filas.map(([etiqueta, valor], i) => (
                <div key={etiqueta} {...revelar(450 + i * 90)}>
                  <dt>{etiqueta}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
            <BotonCompra compra={compra} />
          </div>
        </div>
        <div className="preguntas">
          {detalles.preguntas.map(({ pregunta, respuesta }, i) => (
            <details key={pregunta} {...revelar(i * 120)}>
              <summary>{pregunta}</summary>
              <p>{respuesta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function MasFechas({ eventos }: { eventos: EventoAgenda[] }) {
  if (eventos.length === 0) return null;
  return (
    <section className="mas-fechas envoltura" aria-labelledby="titulo-fechas">
      <div className="caja">
        <span className="antetitulo numero-seccion" {...revelar()}>
          03 / Más fechas
        </span>
        <h2 id="titulo-fechas">
          <TituloMascara lineas={['Todos los miércoles']} retraso={80} />
        </h2>
        <ul>
          {eventos.map((evento, i) => (
            <li key={evento.id} {...revelar(200 + i * 90)}>
              <Link to={`/evento/${evento.urlname}`}>
                <span>{evento.nombre}</span>
                <span className="suave">{formatearFechaCorta(evento.fecha)}</span>
                <Flecha />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Pie() {
  return (
    <footer className="pie envoltura">
      <div className="caja">
        <span>
          {marca.portada.antetitulo} · {marca.cierre.legal}
        </span>
        <span className="pie-credito">
          {marca.cierre.credito}
          <img src="/atonik-logo.png" alt="Atonik" />
        </span>
        <span>{marca.cierre.frase}</span>
      </div>
    </footer>
  );
}

/** Botón fijo abajo en celular; aparece cuando el de la portada ya salió de pantalla por arriba. */
function CompraFija({ compra }: { compra: Compra }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const boton = document.getElementById('comprar-portada');
    if (!boton || !('IntersectionObserver' in window)) return;
    const observador = new IntersectionObserver(([entrada]) => {
      setVisible(!entrada.isIntersecting && entrada.boundingClientRect.top < 0);
    });
    observador.observe(boton);
    return () => observador.disconnect();
  }, []);
  return (
    <div className="compra-fija" data-visible={visible}>
      <BotonCompra compra={compra} conPrecio />
    </div>
  );
}

function DialogoSinVenta({ evento, compra }: { evento: EventoVista; compra: Compra }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const fecha = partesFecha(evento.fecha);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (compra.sinVenta && !d.open) d.showModal();
    if (!compra.sinVenta && d.open) d.close();
  }, [compra.sinVenta]);

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="titulo-dialogo"
      onClose={compra.cerrarSinVenta}
      onClick={(e) => {
        if (e.target === e.currentTarget) compra.cerrarSinVenta();
      }}
    >
      <button type="button" className="cerrar" aria-label="Cerrar" onClick={compra.cerrarSinVenta}>
        ×
      </button>
      <p className="antetitulo acento">
        {[fecha?.diaMes, evento.lugar.zona?.split(',').pop()?.trim()].filter(Boolean).join(' · ')}
      </p>
      <h2 id="titulo-dialogo">{evento.nombre}</h2>
      {compra.precioDesde !== null ? (
        <p className="dialogo-precio">
          Cover · {compra.variosPrecios ? 'desde ' : ''}
          {precioConMoneda(compra.precioDesde)}
        </p>
      ) : null}
      <p>{[fecha?.hora, evento.lugar.nombre].filter(Boolean).join(' · ')}</p>
      <p className="dialogo-nota">
        {compra.sinVenta === 'sin-boletas'
          ? 'Los covers todavía no están a la venta. Vuelve pronto.'
          : 'Vista previa de compra. El pago se habilita cuando el evento esté publicado en Atonik.'}
      </p>
      <button type="button" className="boton boton-borde" onClick={compra.cerrarSinVenta}>
        Volver a la fiesta
      </button>
    </dialog>
  );
}

/** La landing completa de un evento: portada, cinta, manillas, fecha y lugar. */
export default function Landing({
  evento,
  modo,
  agenda = [],
}: {
  evento: EventoVista;
  modo: ModoCartelera;
  agenda?: EventoAgenda[];
}) {
  const compra = useCompra(evento, modo);
  const raiz = useRef<HTMLDivElement>(null);
  // Se reinicia al cambiar de evento: la página de evento reutiliza el mismo componente.
  useEffect(() => (raiz.current ? iniciarAnimacionesScroll(raiz.current) : undefined), [evento]);
  return (
    <div className="sitio" ref={raiz}>
      <div className="progreso" aria-hidden="true" />
      <a className="saltar boton" href="#inicio">
        Ir a la fiesta
      </a>
      <AvisoPrueba modo={modo} />
      <Encabezado compra={compra} />
      <main id="inicio">
        <Portada evento={evento} compra={compra} />
        <Cinta />
        <Manillas />
        <Detalles evento={evento} compra={compra} />
        <MasFechas eventos={agenda} />
      </main>
      <Pie />
      <CompraFija compra={compra} />
      <DialogoSinVenta evento={evento} compra={compra} />
    </div>
  );
}
