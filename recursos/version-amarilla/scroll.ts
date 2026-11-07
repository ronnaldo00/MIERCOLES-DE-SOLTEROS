/**
 * Animaciones ligadas al scroll de la landing.
 *
 * - Revelado: todo elemento con [data-revelar] entra (clase .revelado) la
 *   primera vez que asoma en pantalla. El retraso de cada uno va en la
 *   variable CSS --retraso. Los estilos están en index.css.
 * - Paralaje de la portada, cinta que corre con el scroll y barra de progreso:
 *   un solo listener de scroll, agrupado por requestAnimationFrame.
 *
 * Sin JavaScript o con "reducir movimiento" no se agrega .animado a la raíz,
 * y el contenido queda visible y quieto.
 */
export function iniciarAnimacionesScroll(raiz: HTMLElement): () => void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  raiz.classList.add('animado');

  // ---------- Revelado ----------
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        entrada.target.classList.add('revelado');
        observador.unobserve(entrada.target);
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );
  raiz.querySelectorAll('[data-revelar]').forEach((el) => observador.observe(el));

  // ---------- Paralaje, cinta y progreso ----------
  const portada = raiz.querySelector<HTMLElement>('.portada');
  const foto = raiz.querySelector<HTMLElement>('.portada-foto');
  const textoPortada = raiz.querySelector<HTMLElement>('.portada-texto');
  const cinta = raiz.querySelector<HTMLElement>('.cinta-arrastre');
  const progreso = raiz.querySelector<HTMLElement>('.progreso');

  let pendiente = false;
  const actualizar = () => {
    pendiente = false;
    const y = window.scrollY;

    if (portada && foto && textoPortada) {
      const alto = portada.offsetHeight || 1;
      // Solo mientras la portada está en pantalla: después no vale la pena pintar.
      if (y < alto + 200) {
        const avance = Math.min(y / alto, 1);
        foto.style.transform = `translate3d(0, ${y * 0.35}px, 0)`;
        textoPortada.style.transform = `translate3d(0, ${y * 0.15}px, 0)`;
        textoPortada.style.opacity = String(1 - avance * 0.9);
      }
    }

    if (cinta) {
      // La línea trae 4 copias de las frases; correr el módulo de una copia no deja salto.
      const copia = cinta.scrollWidth / 4 || 1;
      cinta.style.transform = `translate3d(${-((y * 0.4) % copia)}px, 0, 0)`;
    }

    if (progreso) {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      progreso.style.transform = `scaleX(${total > 0 ? Math.min(y / total, 1) : 0})`;
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
    observador.disconnect();
    window.removeEventListener('scroll', alScroll);
    window.removeEventListener('resize', alScroll);
    raiz.classList.remove('animado');
  };
}
