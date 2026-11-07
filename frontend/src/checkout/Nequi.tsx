import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PaymentSummary from "./PaymentSummary";
import { API_URL, toSelectedTickets, type CheckoutState } from "./types";
import { rutaRecibo, useTemaCheckout } from "./tema";

type Status = "idle" | "sending" | "polling" | "success" | "error";

const PaymentNequi: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState | null;
  const tema = useTemaCheckout();

  const buyer = state?.buyer ?? {};
  const name = buyer.full_name ?? buyer.name ?? "";
  const phone = (buyer.phone ?? "").replace(/\D/g, "").slice(0, 10);
  const email = buyer.email ?? "";

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  const canSubmit =
    name.trim().length >= 3 && phone.length === 10 && phone.startsWith("3") && !!email;

  const pollNequiStatus = async (txId: string) => {
    setStatus("polling");
    let attempts = 0;
    const maxAttempts = 60;
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await fetch(`${API_URL}/web/nequi/check/${txId}`);
        const result = await res.json();
        const s = (result.status || "").toUpperCase();
        if (s === "APPROVED" || s === "SUCCESS" || s === "33") {
          setStatus("success");
          setTimeout(() => {
            navigate(rutaRecibo(txId), {
              state: { ...state, transactionId: txId, gateway: "nequi" },
              replace: true,
            });
          }, 1200);
          return;
        }
        if (s === "REJECTED" || s === "DECLINED" || s === "ERROR" || s === "TIMEOUT") {
          setError(`Pago ${s.toLowerCase()}.`);
          setStatus("error");
          return;
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    setError("El pago tardó demasiado. Revisa tu app Nequi y tu correo.");
    setStatus("error");
  };

  const handleSubmit = async () => {
    if (!canSubmit || !state) return;
    setError(null);
    setStatus("sending");
    try {
      const selected_tickets = toSelectedTickets(state.items);
      if (selected_tickets.length === 0) {
        throw new Error("No se pudieron identificar las entradas seleccionadas");
      }

      // Evento gratis: reserva sin pasarela.
      if (state.total <= 0) {
        const resFree = await fetch(`${API_URL}/web/free/reserve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: state.eventId, selected_tickets, buyer }),
        });
        const bodyFree = await resFree.json().catch(() => ({}));
        if (!resFree.ok) throw new Error(bodyFree?.error || "No se pudo reservar");
        setStatus("success");
        setTimeout(() => {
          navigate(rutaRecibo(bodyFree.reference), {
            state: { ...state, transactionId: bodyFree.reference, gateway: "free" },
            replace: true,
          });
        }, 1200);
        return;
      }

      // El backend recalcula el precio desde selected_tickets (contrato único).
      const res = await fetch(`${API_URL}/web/nequi/make_payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: state.eventId,
          selected_tickets,
          coupon: state.coupon || "",
          buyer,
        }),
      });
      if (res.status !== 202 && !res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "No se pudo iniciar el pago con Nequi");
      }
      const data = await res.json();
      const txId = data.transactionId || data.transaction_id;
      if (!txId) throw new Error("No se devolvió ID de transacción");
      await pollNequiStatus(txId);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error iniciando el pago");
      setStatus("error");
    }
  };

  if (!state) return null;

  const processing = status === "sending" || status === "polling";

  if (status === "success") {
    return (
      <Overlay
        title="¡Pago aprobado!"
        subtitle="Redirigiendo al recibo..."
        emoji="✓"
        color="#10b981"
      />
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ background: tema.fondo }}>
      <div className="container mx-auto max-w-5xl px-5 py-10 lg:px-8 lg:py-14">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400 hover:text-white mb-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
        >
          ← Volver
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Pagar con Nequi</h1>
              <p className="text-gray-400 text-sm">
                Recibirás una notificación en tu app Nequi para confirmar el pago.
              </p>
            </div>

            {/* Nequi tiene su propia marca (rosa) — no se tematiza con el color
                del organizador, para que siga siendo reconocible como Nequi. */}
            <div className="space-y-3 bg-[#1a0a2a]/80 border border-[#402080]/50 rounded-2xl p-6">
              <SummaryRow label="Nombre" value={name || "—"} />
              <SummaryRow label="Celular Nequi" value={phone ? `+57 ${phone}` : "—"} />
              <SummaryRow label="Correo" value={email || "—"} />
              <button
                onClick={() => navigate(-1)}
                className="text-xs text-pink-300 underline mt-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
              >
                Cambiar datos
              </button>
              <p className="text-xs text-gray-500">
                El código de activación llegará a tu correo (y WhatsApp si tu Nequi está vinculado).
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || processing}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento ${
                canSubmit && !processing
                  ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.4)]"
                  : "bg-[#402080]/30 text-gray-500 cursor-not-allowed border border-[#402080]/50"
              }`}
            >
              {status === "sending"
                ? "Enviando..."
                : status === "polling"
                  ? "Esperando confirmación..."
                  : "Confirmar compra"}
            </button>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <PaymentSummary state={state} currentStep={3} />
            </div>
          </div>
        </div>
      </div>

      {processing && (
        <Overlay
          title={status === "sending" ? "Enviando solicitud..." : "Aprueba el pago en tu app Nequi"}
          subtitle={
            status === "polling"
              ? "Estamos esperando la confirmación de Nequi..."
              : undefined
          }
        />
      )}
    </div>
  );
};

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center gap-3">
    <span className="text-xs uppercase tracking-wider text-gray-400 font-bold">{label}</span>
    <span className="text-sm text-white font-medium truncate">{value}</span>
  </div>
);

interface OverlayProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  color?: string;
}
const Overlay: React.FC<OverlayProps> = ({ title, subtitle, emoji, color }) => {
  const tema = useTemaCheckout();
  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center" style={{ background: `${tema.fondo}F2` }}>
      <div className="text-center px-6">
        {emoji ? (
          <div
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl font-bold mb-4"
            style={{ backgroundColor: color || "#DB0082" }}
          >
            {emoji}
          </div>
        ) : (
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
        )}
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-gray-400 mt-2 max-w-sm mx-auto">{subtitle}</p>}
      </div>
    </div>
  );
};

export default PaymentNequi;
