import React from "react";
import type { CheckoutState } from "./types";
import { hexToRgb, resolverPrimario, useTemaCheckout } from "./tema";

interface Props {
  state: CheckoutState;
  currentStep?: number;
  totalSteps?: number;
}

const PaymentSummary: React.FC<Props> = ({ state, currentStep = 2, totalSteps = 3 }) => {
  const tema = useTemaCheckout();
  const primary = resolverPrimario(state.primaryColor, tema);
  const rgb = hexToRgb(primary);

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: state.currency || "COP",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div
      className="backdrop-blur-xl rounded-3xl p-6 shadow-xl"
      style={{ background: `${tema.superficie}CC`, border: `1px solid rgba(${rgb},0.3)` }}
    >
      <div className="flex items-center gap-4 mb-5">
        {state.eventImage && (
          <img
            src={state.eventImage}
            alt={state.eventName}
            className="w-20 h-20 rounded-xl object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider font-bold" style={{ color: primary }}>Evento</p>
          <h3 className="font-bold text-white text-lg truncate">{state.eventName}</h3>
        </div>
      </div>

      <div className="space-y-2 pt-4" style={{ borderTop: `1px solid rgba(${rgb},0.3)` }}>
        {state.items.map((it, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-300">
              {it.count}× {it.ticketName}
              <span className="text-gray-500"> · {it.stageName}</span>
            </span>
            <span className="text-white font-medium">{fmt(it.price * it.count)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 space-y-2" style={{ borderTop: `1px solid rgba(${rgb},0.3)` }}>
        <div className="flex justify-between text-sm text-gray-400">
          <span>Subtotal</span>
          <span>{fmt(state.subtotal)}</span>
        </div>
        {state.serviceFee > 0 && (
          <div className="flex justify-between text-sm text-gray-400">
            <span>Tarifa de servicio</span>
            <span>{fmt(state.serviceFee * state.totalTickets)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-white pt-2" style={{ borderTop: `1px solid rgba(${rgb},0.25)` }}>
          <span>Total</span>
          <span>{fmt(state.total)}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full"
            style={{
              backgroundColor: i < currentStep ? primary : `rgba(${rgb},0.25)`,
            }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Paso {currentStep} de {totalSteps}
      </p>
    </div>
  );
};

export default PaymentSummary;
