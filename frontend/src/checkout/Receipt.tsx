import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_URL, type CheckoutState } from "./types";
import { hexToRgb, resolverPrimario, useTemaCheckout } from "./tema";

interface TransactionInfo {
  status: string;
  amount_in_cents?: number;
  currency?: string;
  reference?: string;
  payment_method?: { type?: string };
  created_at?: string;
}

interface ActivationCode {
  code: string;
  used: boolean;
  ticket_index?: number;
  ticket_total?: number;
}

interface CodesResponse {
  transactionId: string;
  status: string;
  event_name: string;
  total: number;
  codes: ActivationCode[];
}

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.atonik.Atonik&hl=es_CO";
const APP_STORE_URL = "https://apps.apple.com/co/app/atonik/id6751009147";
// Página de ayuda genérica de Atonik (no es parte de este sitio, no hay equivalente
// local): se deja como está a propósito, ver README.md "Enlaces que quedan fuera".
const STEPS_URL = "https://atonik-proyect.web.app/steps-activation-code";

const Receipt: React.FC = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const passed = location.state as
    | (CheckoutState & { transactionId?: string; gateway?: string })
    | null;
  const tema = useTemaCheckout();
  const primary = resolverPrimario(passed?.primaryColor, tema);
  const rgb = hexToRgb(primary);

  const [info, setInfo] = useState<TransactionInfo | null>(null);
  const [codesData, setCodesData] = useState<CodesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!transactionId) {
      navigate("/", { replace: true });
      return;
    }
    const run = async () => {
      try {
        const [txRes, codesRes] = await Promise.all([
          fetch(`${API_URL}/check-transaction/${transactionId}`).catch(() => null),
          fetch(`${API_URL}/web/transactions/${transactionId}/codes`).catch(() => null),
        ]);
        if (txRes && txRes.ok) setInfo(await txRes.json());
        if (codesRes && codesRes.ok) setCodesData(await codesRes.json());
        if (!txRes?.ok && !codesRes?.ok) throw new Error("No se pudo cargar el recibo");
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [transactionId, navigate]);

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const amount =
    (info?.amount_in_cents ? info.amount_in_cents / 100 : undefined) ?? passed?.total ?? 0;
  const currency = info?.currency || passed?.currency || "COP";
  const status = codesData?.status || info?.status;
  const approved =
    status === "APPROVED" || status === "SUCCESS" || status === "33";
  const codes = codesData?.codes ?? [];
  const eventName = codesData?.event_name || passed?.eventName || "tu evento";

  const copyCode = async (code: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: tema.fondo }}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2" style={{ borderBottomColor: primary }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white py-12 px-4" style={{ background: tema.fondo }}>
      <div className="max-w-md mx-auto">
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl font-bold mb-5"
          style={{ backgroundColor: approved ? "#10b981" : "#ef4444" }}
        >
          {approved ? "✓" : "×"}
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">
          {approved ? "¡Pago aprobado!" : "Pago no completado"}
        </h1>
        <p className="text-center text-gray-400 mb-7 text-sm">
          {approved
            ? `Te enviamos tu código${codes.length > 1 ? "s" : ""} de activación al correo. Descarga la app de Atonik para canjear${codes.length > 1 ? "los" : "lo"}.`
            : error || `Estado: ${status || "desconocido"}`}
        </p>

        {approved && codes.length > 0 && (
          <div className="space-y-3 mb-6">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">
              Código{codes.length > 1 ? "s" : ""} de activación
            </p>
            {codes.map((c, i) => (
              <div
                key={c.code}
                className="rounded-2xl p-5"
                style={{ background: tema.superficie, border: `1px solid rgba(${rgb},0.4)` }}
              >
                {c.ticket_total && c.ticket_total > 1 && (
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">
                    Entrada {c.ticket_index ?? i + 1} / {c.ticket_total}
                  </p>
                )}
                <p className="font-mono text-2xl tracking-[0.18em] font-bold text-center select-all break-all" style={{ color: tema.acento }}>
                  {c.code}
                </p>
                <button
                  onClick={() => copyCode(c.code, i)}
                  className="w-full mt-3 py-2 rounded-lg text-xs font-bold transition-colors"
                  style={{ background: `rgba(${rgb},0.15)`, color: primary }}
                >
                  {copiedIdx === i ? "✓ Copiado" : "Copiar código"}
                </button>
                {c.used && (
                  <p className="mt-2 text-[11px] text-amber-400 text-center">Ya canjeado</p>
                )}
              </div>
            ))}
          </div>
        )}

        {approved && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 mb-6">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">
              Descarga la app
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center py-3 rounded-xl text-white text-sm font-bold"
                style={{ background: primary }}
              >
                Google Play
              </a>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center py-3 rounded-xl bg-white text-sm font-bold"
                style={{ color: tema.fondo }}
              >
                App Store
              </a>
            </div>
            <a
              href={STEPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-center text-xs underline"
              style={{ color: tema.acento }}
            >
              ¿Cómo activar mi código?
            </a>
          </div>
        )}

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 space-y-2">
          <Row label="Evento" value={eventName} />
          <Row label="Transacción" value={transactionId || "-"} mono />
          <Row label="Estado" value={status || "-"} />
          {passed?.gateway && (
            <Row label="Método" value={methodLabel(passed.gateway)} />
          )}
          <Row label="Total" value={fmt(amount, currency)} bold />
        </div>

        <button
          onClick={() => navigate("/")}
          className="w-full mt-6 py-3 rounded-xl border border-white/15 text-gray-300 hover:bg-white/[0.04] transition-colors text-sm font-semibold"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

function methodLabel(gateway: string): string {
  if (gateway === "nequi") return "Nequi";
  if (gateway === "pse") return "PSE";
  if (gateway === "card" || gateway === "wompi") return "Tarjeta · Wompi";
  return gateway;
}

const Row: React.FC<{ label: string; value: string; mono?: boolean; bold?: boolean }> = ({
  label,
  value,
  mono,
  bold,
}) => (
  <div className="flex justify-between items-center gap-4">
    <span className="text-xs text-gray-400 shrink-0 uppercase tracking-wider font-semibold">{label}</span>
    <span
      className={`text-right ${mono ? "font-mono text-xs" : ""} ${
        bold ? "font-bold text-base" : "text-sm"
      } text-white truncate`}
    >
      {value}
    </span>
  </div>
);

export default Receipt;
