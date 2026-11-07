import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EventoVista } from '../datos/cartelera';
import type { ModoCartelera } from './useCartelera';

/** Misma llave que lee el checkout vendorizado para precargar cantidades: { ticket_id: cantidad }. */
const LLAVE_CANTIDADES = 'atonik_checkout_qty';

export type MotivoSinVenta = 'vista-previa' | 'sin-boletas';

/**
 * "Comprar cover": con el evento en Atonik y boletas a la venta, lleva al
 * checkout (precargando 1 cover si solo hay una tarifa). Si no se puede
 * pagar todavía, abre el diálogo de vista previa con el motivo.
 */
export function useCompra(evento: EventoVista | null, modo: ModoCartelera) {
  const navigate = useNavigate();
  const [sinVenta, setSinVenta] = useState<MotivoSinVenta | null>(null);

  const disponibles = (evento?.tarifas ?? []).filter((tarifa) => !tarifa.agotada);
  const agotado = Boolean(evento && evento.tarifas.length > 0 && disponibles.length === 0);
  const precioDesde = disponibles.length ? Math.min(...disponibles.map((tarifa) => tarifa.precio)) : null;
  const variosPrecios = new Set(disponibles.map((tarifa) => tarifa.precio)).size > 1;

  const comprar = useCallback(() => {
    if (!evento || agotado) return;
    const pagables = disponibles.filter((tarifa) => tarifa.id);
    if (modo !== 'atonik' || !evento.urlname) {
      setSinVenta('vista-previa');
      return;
    }
    if (pagables.length === 0) {
      setSinVenta('sin-boletas');
      return;
    }
    try {
      if (pagables.length === 1) {
        sessionStorage.setItem(LLAVE_CANTIDADES, JSON.stringify({ [pagables[0].id as string]: 1 }));
      } else {
        sessionStorage.removeItem(LLAVE_CANTIDADES);
      }
    } catch {
      // Sin sessionStorage el checkout abre igual, solo que sin precargar.
    }
    navigate(`/evento/${evento.urlname}/checkout`);
  }, [evento, agotado, disponibles, modo, navigate]);

  return {
    comprar,
    agotado,
    precioDesde,
    variosPrecios,
    sinVenta,
    cerrarSinVenta: () => setSinVenta(null),
  };
}

export type Compra = ReturnType<typeof useCompra>;
