/**
 * Animaciones ligadas al scroll de la landing.
 *
 * - Revelado: todo elemento con [data-revelar] entra (clase .revelado) cada
 *   vez que asoma en pantalla y se reinicia al salir del todo. El retraso de cada uno va en la
 *   variable CSS --retraso. Los estilos están en index.css.
 * - Paralaje: todo elemento con [data-paralaje="factor"] se corre en vertical
 *   según qué tan lejos está su centro del centro de la pantalla (factor
 *   negativo = va más lento que la página, positivo = más rápido).
 * - Barra de progreso (.progreso) arriba.
 * Paralaje y progreso comparten un solo listener de scroll, agrupado por
 * requestAnimationFrame.
 *
 * Sin JavaScript o con "reducir movimiento" no se agrega .animado a la raíz,
 * y el contenido queda visible y quieto.
 */
export function iniciarAnimacionesScroll(raiz: HTMLElement): () => void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  raiz.classList.add('animado');

  // ---------- Revelado ----------
  // Entra cuando asoma un 15 % y vuelve a esconderse cuando sale del todo de
  // la pantalla, para que la animación se repita cada vez que se pasa por ahí.
  // Son dos observadores: si se escondiera con el mismo margen de entrada,
  // quedaría una franja abajo con elementos vacíos a la vista.
  const entrada = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) if (e.isIntersecting) e.target.classList.add('revelado');
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );
  const salida = new IntersectionObserver((entradas) => {
    for (const e of entradas) if (!e.isIntersecting) e.target.classList.remove('revelado');
  });
  raiz.querySelectorAll('[data-revelar]').forEach((el) => {
    entrada.observe(el);
    salida.observe(el);
  });

  // ---------- Paralaje y progreso ----------
  const capas = [...raiz.querySelectorAll<HTMLElement>('[data-paralaje]')].map((el) => ({
    el,
    factor: Number(el.dataset.paralaje) || 0,
  }));
  const progreso = raiz.querySelector<HTMLElement>('.progreso');

  let pendiente = false;
  const actualizar = () => {
    pendiente = false;
    const alto = window.innerHeight;

    for (const { el, factor } of capas) {
      // Se mide el padre: el elemento mismo ya está corrido y daría un valor que se realimenta.
      const caja = (el.parentElement ?? el).getBoundingClientRect();
      if (caja.bottom < -200 || caja.top > alto + 200) continue;
      const distancia = caja.top + caja.height / 2 - alto / 2;
      el.style.transform = `translate3d(0, ${(distancia * factor).toFixed(1)}px, 0)`;
    }

    if (progreso) {
      const total = document.documentElement.scrollHeight - alto;
      progreso.style.transform = `scaleX(${total > 0 ? Math.min(window.scrollY / total, 1) : 0})`;
    }
  };
  const alScroll = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(actualizar);
  };

  actualizar();
  window.addEventListener('scroll', alScroll, { passive: true });
  window.addEventListener('resize', alScroll);

  return () => {
    entrada.disconnect();
    salida.disconnect();
    window.removeEventListener('scroll', alScroll);
    window.removeEventListener('resize', alScroll);
    raiz.classList.remove('animado');
  };
}
