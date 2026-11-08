import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { marca, medios } from '../marca';
import type { EventoAgenda, EventoVista, Lugar } from '../datos/cartelera';
import type { ModoCartelera } from '../hooks/useCartelera';
import { useCompra, type Compra } from '../hooks/useCompra';
import { formatearFechaCorta, partesFecha } from '../utilidades/fecha';
import { precioConMoneda, precioCorto } from '../utilidades/precio';
import { iniciarAnimacionesScroll } from '../animaciones/scroll';
import Medio from './Medio';

/*
 * Estructura tomada de recursos/diseno-original/referencia-estructura.jpg
 * (sitio de discoteca negro y rojo): encabezado con logo en recuadro, portada
 * con texto y medio grande, tira de 4 fotos, presentación, carrusel con
 * tipografía decorativa, galería, tres botones de contorno, banda roja con
 * horario / lugar / próxima noche, y pie. Las manillas son propias del evento.
 */

/**
 * Marca un elemento para que entre al aparecer en pantalla (ver animaciones/scroll.ts).
 * `tipo` elige la entrada en index.css: '' sube, 'derecha', 'izquierda', 'mascara', 'sticker', 'zoom'.
 */
function revelar(retraso = 0, tipo = '', estilo: CSSProperties = {}) {
  return { 'data-revelar': tipo, style: { ...estilo, '--retraso': `${retraso}ms` } as CSSProperties };
}

/** Título que sube línea por línea desde una máscara. */
function TituloMascara({ lineas, retraso = 0, paso = 110 }: { lineas: ReactNode[]; retraso?: number; paso?: number }) {
  return (
    <>
      {lineas.map((linea, i) => (
        <span key={i} className="mascara" {...revelar(retraso + i * paso, 'mascara')}>
          <span className="mascara-texto">{linea}</span>
        </span>
      ))}
    </>
  );
}

/** "WE GATHER" en un recuadro de línea fina, como el logo de la referencia. */
function LogoRecuadro({ className = '' }: { className?: string }) {
  return <span className={`logo-recuadro ${className}`}>{marca.logoTexto}</span>;
}

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
    <button
      type="button"
      id={id}
      className={`boton boton-rojo ${className}`}
      onClick={compra.comprar}
      disabled={compra.agotado}
    >
      {textoCompra(compra, conPrecio)}
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

function IconoInstagram() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function enlaceInstagram(): string | null {
  const usuario = marca.instagram?.replace(/^@/, '').trim();
  return usuario ? `https://www.instagram.com/${usuario}/` : null;
}

export function Encabezado({ compra }: { compra?: Compra }) {
  const instagram = enlaceInstagram();
  return (
    <header className="encabezado envoltura">
      <div className="nav caja">
        <Link className="marca" to="/" aria-label={`${marca.nombre}, inicio`}>
          <LogoRecuadro />
        </Link>
        {compra ? (
          <nav className="nav-derecha" aria-label="Secciones">
            <a href="#manillas">Manillas</a>
            <a href="#noche">La noche</a>
            {instagram ? (
              <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <IconoInstagram />
              </a>
            ) : null}
            <BotonCompra compra={compra} className="boton-nav" />
          </nav>
        ) : null}
      </div>
    </header>
  );
}

/** "Miércoles de Solteros" → ["Miércoles", "de Solteros"]. */
function partirNombre(nombre: string): string[] {
  const espacio = nombre.indexOf(' ');
  return espacio > 0 ? [nombre.slice(0, espacio), nombre.slice(espacio + 1)] : [nombre];
}

function Portada({ evento, compra }: { evento: EventoVista; compra: Compra }) {
  const fecha = partesFecha(evento.fecha);
  return (
    <section className="portada envoltura" aria-labelledby="titulo">
      <div className="portada-fondo" aria-hidden="true">
        {medios.fondo_portada ? <Medio medio={medios.fondo_portada} nombre="fondo portada" prioridad /> : null}
      </div>
      <div className="portada-grilla caja">
        <div className="portada-texto">
          <h1 id="titulo">
            <TituloMascara lineas={partirNombre(evento.nombre)} retraso={150} />
          </h1>
          <p className="portada-lema">
            <TituloMascara lineas={marca.portada.lema} retraso={420} paso={90} />
          </p>
          <p className="portada-fecha" {...revelar(750)}>
            {fecha ? `${fecha.diaSemana} ${fecha.diaMes}${fecha.hora ? ` · ${fecha.hora}` : ''}` : 'Fecha por confirmar'}
          </p>
          <div className="portada-accion" {...revelar(850)}>
            <BotonCompra compra={compra} conPrecio id="comprar-portada" />
          </div>
        </div>
        <div className="portada-marco" {...revelar(300, 'zoom')}>
          <div className="portada-medio" data-paralaje="-0.05">
            <Medio medio={medios.principal} nombre="video o foto principal" prioridad />
          </div>
        </div>
      </div>
      <div className="tira caja">
        {medios.tira.map((medio, i) => (
          <div key={i} className="tira-celda" {...revelar(900 + i * 110)}>
            <Medio medio={medio} nombre={`tira ${i + 1}`} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Logo de We Gather como emblema de la presentación y del pie. */
function Emblema({ className = '' }: { className?: string }) {
  return <img className={`emblema ${className}`} src="/img/logo.webp" alt="" width="96" height="96" />;
}

function Presentacion({ evento }: { evento: EventoVista }) {
  const { presentacion } = marca;
  return (
    <section className="presentacion envoltura" aria-labelledby="titulo-presentacion">
      <div className="presentacion-caja">
        <div {...revelar(0, 'zoom')}>
          <Emblema />
        </div>
        <h2 id="titulo-presentacion">
          <TituloMascara lineas={[presentacion.titulo]} retraso={120} />
        </h2>
        <p {...revelar(300)}>{evento.descripcion && evento.urlname ? evento.descripcion : presentacion.texto}</p>
      </div>
    </section>
  );
}

/**
 * Carrusel al lado de "La soltería también se celebra".
 * - Pasa solo cada 3,5 s (se pausa con el mouse encima o con el teclado
 *   adentro; no pasa solo si la persona pidió "reducir movimiento").
 * - El recuadro tiene la forma de las fotos (vertical 4:5), así que se ven
 *   completas y sin bordes a los lados.
 */
function Carrusel() {
  const lista = medios.carrusel.length ? medios.carrusel : [null];
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = lista.length;
  const mover = (paso: number) => setActual((i) => (i + paso + total) % total);

  useEffect(() => {
    if (total < 2 || pausado) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setActual((i) => (i + 1) % total), 3500);
    return () => window.clearInterval(id);
  }, [total, pausado]);

  return (
    <div
      className="carrusel"
      aria-roledescription="carrusel"
      aria-label="Fotos de la noche"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      {lista.map((medio, i) => (
        <div
          key={i}
          className="carrusel-diapositiva"
          aria-hidden={i !== actual}
          data-activa={i === actual}
          aria-roledescription="diapositiva"
          aria-label={`${i + 1} de ${total}`}
        >
          {/* prioridad: todas cargan de una vez para que no salgan en blanco al pasar */}
          <Medio medio={medio} nombre={`carrusel ${i + 1}`} prioridad />
        </div>
      ))}
      <LogoRecuadro className="carrusel-logo" />
      {total > 1 ? (
        <>
          <button type="button" className="carrusel-flecha izquierda" aria-label="Anterior" onClick={() => mover(-1)}>
            ‹
          </button>
          <button type="button" className="carrusel-flecha derecha" aria-label="Siguiente" onClick={() => mover(1)}>
            ›
          </button>
          <div className="carrusel-puntos" aria-hidden="true">
            {lista.map((_, i) => (
              <span key={i} data-activo={i === actual} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Ambiente() {
  const { deco } = marca;
  return (
    <section className="ambiente" aria-labelledby="titulo-ambiente">
      <div className="ambiente-izquierda" {...revelar(0, 'izquierda')}>
        <Carrusel />
      </div>
      <div className="ambiente-derecha">
        <h2 id="titulo-ambiente" className="deco">
          <span className="deco-linea-1" {...revelar(100, 'derecha')}>
            {deco.linea_1}
          </span>
          <span className="deco-fila">
            <span className="deco-grande" {...revelar(220, 'derecha')}>
              {deco.grande}
            </span>
            <span className="deco-columna" {...revelar(340, 'derecha')}>
              <span className="deco-derecha-1">{deco.derecha_1}</span>
              <span className="deco-derecha-2">{deco.derecha_2}</span>
              <span className="deco-derecha-3">{deco.derecha_3}</span>
            </span>
          </span>
        </h2>
        <p {...revelar(480)}>{deco.texto}</p>
      </div>
    </section>
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
          <h2 id="titulo-manillas" className="titulo-recuadro" {...revelar()}>
            {manillas.titulo}
          </h2>
          <p className="suave" {...revelar(150)}>
            {manillas.intro}
          </p>
        </div>
        <div className="manillas-grilla" role="group" aria-label="Elige una manilla">
          {manillas.opciones.map((manilla, i) => (
            <button
              key={manilla.color}
              type="button"
              className="manilla"
              aria-pressed={i === elegida}
              onClick={() => setElegida(i)}
              {...revelar(150 + i * 140, 'sticker', { '--tono': manilla.tono } as CSSProperties)}
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
        <div className="preguntas">
          {manillas.preguntas.map(({ pregunta, respuesta }, i) => (
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

/**
 * Galería: se ven 4 fotos a la vez (2 en celular). Si hay más de 4, la fila
 * corre sola de derecha a izquierda sin parar y se pausa con el mouse encima.
 * Para que el giro no tenga saltos, la fila va DOS veces seguida: cuando la
 * primera copia termina de salir, la segunda está justo donde empezó la primera
 * y la animación vuelve a empezar sin que se note.
 */
function Galeria() {
  const fotos = medios.galeria;
  const corre = fotos.length > 4;
  const fila = corre ? [...fotos, ...fotos] : fotos;
  return (
    <section
      className={`galeria ${corre ? 'galeria-corre' : ''}`}
      aria-label="Galería"
      // --fotos le dice al CSS cuántas fotos hay (para calcular cuánto correr)
      {...revelar(0, '', { '--fotos': fotos.length } as CSSProperties)}
    >
      <div className="galeria-pista">
        {fila.map((medio, i) => (
          // La segunda copia se esconde de los lectores de pantalla (es repetida)
          <div key={i} className="galeria-celda" aria-hidden={i >= fotos.length ? true : undefined}>
            {/* prioridad: todas cargan de una vez para que no entren en blanco */}
            <Medio medio={medio} nombre={`galería ${(i % fotos.length) + 1}`} prioridad />
          </div>
        ))}
      </div>
    </section>
  );
}

function enlaceMapa(lugar: Lugar): string | null {
  const destino = [lugar.nombre, lugar.direccion, lugar.zona].filter(Boolean).join(', ');
  return destino ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}` : null;
}

/** Los tres botones de contorno de la referencia: comprar, manillas, cómo llegar. */
function Accesos({ evento, compra }: { evento: EventoVista; compra: Compra }) {
  const mapa = enlaceMapa(evento.lugar);
  return (
    <nav className="accesos envoltura" aria-label="Accesos rápidos">
      <div className="caja accesos-fila">
        <button type="button" className="acceso acceso-compra" onClick={compra.comprar} disabled={compra.agotado} {...revelar(0)}>
          {compra.agotado ? 'Agotado' : marca.portada.cta}
        </button>
        <a className="acceso" href="#manillas" {...revelar(100)}>
          Las manillas
        </a>
        {mapa ? (
          <a className="acceso" href={mapa} target="_blank" rel="noopener noreferrer" {...revelar(200)}>
            Cómo llegar
          </a>
        ) : null}
      </div>
    </nav>
  );
}

function Noche({ evento, compra }: { evento: EventoVista; compra: Compra }) {
  const { noche } = marca;
  const fecha = partesFecha(evento.fecha);
  const diaSemana = fecha ? fecha.diaSemana.replace('.', '') : null;
  const diaLargo = diaSemana ? { Lun: 'Lunes', Mar: 'Martes', Mié: 'Miércoles', Jue: 'Jueves', Vie: 'Viernes', Sáb: 'Sábado', Dom: 'Domingo' }[diaSemana] ?? diaSemana : null;
  const precio =
    compra.precioDesde !== null ? `${compra.variosPrecios ? 'Desde ' : ''}${precioConMoneda(compra.precioDesde)}` : null;
  return (
    <section className="noche envoltura" id="noche" aria-labelledby="titulo-proxima">
      <div className="noche-fondo" aria-hidden="true">
        {medios.fondo_noche ? <Medio medio={medios.fondo_noche} nombre="fondo de la noche" /> : null}
      </div>
      <div className="noche-grilla caja">
        <div className="noche-columna">
          <div {...revelar(0, 'izquierda')}>
            <h3 className="titulo-recuadro">{noche.horario}</h3>
            <dl className="noche-datos">
              <div>
                <dt>{diaLargo ?? 'Por confirmar'}</dt>
                <dd>{fecha?.hora ? `Desde las ${fecha.hora}` : 'Hora por confirmar'}</dd>
              </div>
              {precio ? (
                <div>
                  <dt>Cover</dt>
                  <dd>{precio}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div {...revelar(150, 'izquierda')}>
            <h3 className="titulo-recuadro">{noche.lugar}</h3>
            <p className="noche-lugar">
              {[evento.lugar.nombre, evento.lugar.direccion, evento.lugar.zona].filter(Boolean).map((linea) => (
                <span key={linea}>{linea}</span>
              ))}
            </p>
          </div>
        </div>
        <div className="noche-persona" data-paralaje="0.08" {...revelar(100, 'zoom')}>
          <Medio medio={medios.persona} nombre="persona (foto recortada o DJ)" />
        </div>
        <div className="noche-columna noche-proxima" {...revelar(250, 'derecha')}>
          <h3 id="titulo-proxima" className="titulo-recuadro">
            {noche.proxima}
          </h3>
          <p className="noche-evento">{evento.nombre}</p>
          <p>{fecha ? `${diaLargo}, ${fecha.diaMes}` : 'Fecha por confirmar'}</p>
          {fecha?.hora ? <p>Desde las {fecha.hora}</p> : null}
          <BotonCompra compra={compra} conPrecio className="boton-pequeno" />
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
        <h2 id="titulo-fechas" className="titulo-recuadro" {...revelar()}>
          Más fechas
        </h2>
        <ul>
          {eventos.map((evento, i) => (
            <li key={evento.id} {...revelar(150 + i * 90)}>
              <Link to={`/evento/${evento.urlname}`}>
                <span>{evento.nombre}</span>
                <span className="suave">{formatearFechaCorta(evento.fecha)}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Pie() {
  const instagram = enlaceInstagram();
  return (
    <footer className="pie envoltura">
      <div className="pie-caja">
        <LogoRecuadro />
        <Emblema className="pie-emblema" />
        <p className="pie-frase">{marca.cierre.frase}</p>
        <p className="pie-legal">
          © {new Date().getFullYear()} {marca.nombre} · {marca.cierre.legal}
        </p>
        <hr />
        <div className="pie-enlaces">
          {instagram ? (
            <a className="pie-red" href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <IconoInstagram />
            </a>
          ) : null}
          <span className="pie-credito">
            {marca.cierre.credito}
            <img src="/atonik-logo.png" alt="Atonik" />
          </span>
        </div>
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
      <p className="dialogo-antetitulo">
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
      <button type="button" className="acceso" onClick={compra.cerrarSinVenta}>
        Volver a la fiesta
      </button>
    </dialog>
  );
}

/** La landing completa de un evento. */
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
      <a className="saltar boton boton-rojo" href="#inicio">
        Ir a la fiesta
      </a>
      <AvisoPrueba modo={modo} />
      <Encabezado compra={compra} />
      <main id="inicio">
        <Portada evento={evento} compra={compra} />
        <Presentacion evento={evento} />
        <Ambiente />
        <Manillas />
        <Galeria />
        <Accesos evento={evento} compra={compra} />
        <Noche evento={evento} compra={compra} />
        <MasFechas eventos={agenda} />
      </main>
      <Pie />
      <CompraFija compra={compra} />
      <DialogoSinVenta evento={evento} compra={compra} />
    </div>
  );
}
