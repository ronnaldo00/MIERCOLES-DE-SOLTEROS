import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PaymentSummary from "./PaymentSummary";
import { API_URL, type CheckoutState, type WompiPresignedData } from "./types";
import { darken, hexToRgb, resolverPrimario, rutaRecibo, useTemaCheckout } from "./tema";

type Status =
  | "idle"
  | "fetchingPresigned"
  | "tokenizing"
  | "creatingTransaction"
  | "polling"
  | "success"
  | "error";

// La URL de tokenización se deriva del entorno de la public key (pub_prod_* →
// producción, pub_test_* → sandbox), con override por VITE_WOMPI_API_URL.
// Evita el sandbox hardcodeado que cobraría en el entorno equivocado.
const wompiTokensUrl = (publicKey?: string): string => {
  const base =
    import.meta.env.VITE_WOMPI_API_URL ||
    (publicKey && publicKey.startsWith("pub_prod")
      ? "https://production.wompi.co/v1"
      : "https://sandbox.wompi.co/v1");
  return `${base}/tokens/cards`;
};

const detectCardType = (raw: string): string => {
  const n = raw.replace(/\s+/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6/.test(n)) return "discover";
  return "card";
};

const formatCardNumber = (v: string) =>
  v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

const PaymentCard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState | null;
  const tema = useTemaCheckout();
  const primary = resolverPrimario(state?.primaryColor, tema);
  const rgb = hexToRgb(primary);

  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");

  const [presigned, setPresigned] = useState<WompiPresignedData | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
      return;
    }
    const fetchPresigned = async () => {
      try {
        setStatus("fetchingPresigned");
        const res = await fetch(`${API_URL}/wompi/presigned_acceptance`);
        const data = await res.json();
        setPresigned(data);
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar la pasarela. Intenta de nuevo.");
      } finally {
        setStatus("idle");
      }
    };
    fetchPresigned();
  }, [state, navigate]);

  const presignedAcceptance = useMemo(
    () => presigned?.data?.presigned_acceptance || presigned?.presigned_acceptance,
    [presigned],
  );
  const presignedPrivacy = useMemo(
    () =>
      presigned?.data?.presigned_personal_data_auth ||
      presigned?.presigned_personal_data_auth,
    [presigned],
  );
  const publicKey = useMemo(
    () => presigned?.public_key || (presigned as any)?.data?.public_key,
    [presigned],
  );

  const validCard =
    number.replace(/\s+/g, "").length >= 13 &&
    name.trim().length >= 3 &&
    /^\d{1,2}$/.test(expMonth) &&
    /^\d{2,4}$/.test(expYear) &&
    /^\d{3,4}$/.test(cvc);

  const canSubmit =
    validCard && acceptTerms && acceptPrivacy && !!presignedAcceptance && !!publicKey;

  const tokenizeCard = async (): Promise<string | null> => {
    try {
      const res = await fetch(wompiTokensUrl(publicKey), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicKey}`,
        },
        body: JSON.stringify({
          number: number.replace(/\s+/g, ""),
          cvc,
          exp_month: expMonth.padStart(2, "0"),
          exp_year: expYear.slice(-2),
          card_holder: name,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result?.data?.id) {
        console.error("Token error:", result);
        setError(result?.error?.messages?.[0] || "Tarjeta inválida");
        return null;
      }
      return result.data.id;
    } catch (e) {
      console.error(e);
      setError("Error de red al validar la tarjeta");
      return null;
    }
  };

  const pollStatus = async (txId: string) => {
    setStatus("polling");
    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await fetch(`${API_URL}/check-transaction/${txId}`);
        const result = await res.json();
        if (result.status === "APPROVED") {
          setStatus("success");
          setTimeout(() => {
            navigate(rutaRecibo(txId), {
              state: { ...state, transactionId: txId, gateway: "wompi" },
              replace: true,
            });
          }, 1200);
          return;
        }
        if (
          result.status === "DECLINED" ||
          result.status === "VOIDED" ||
          result.status === "TIMEOUT" ||
          result.status === "ERROR"
        ) {
          setError(`Transacción ${result.status.toLowerCase()}.`);
          setStatus("error");
          return;
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    setError("La transacción tardó demasiado. Revisa tus tickets.");
    setStatus("error");
  };

  const handleSubmit = async () => {
    if (!canSubmit || !state) return;
    setError(null);
    setStatus("tokenizing");

    const token = await tokenizeCard();
    if (!token) {
      setStatus("error");
      return;
    }

    setStatus("creatingTransaction");
    const buyer = state.buyer ?? {};
    const customerEmail = buyer.email;
    if (!customerEmail) {
      setError("Falta el correo del comprador. Vuelve al checkout.");
      setStatus("error");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/web/wompi/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_in_cents: Math.round(state.total * 100),
          eventId: state.eventId,
          quantity: state.totalTickets,
          totalTickets: state.totalTickets,
          selected_tickets: state.items.map((it) => ({
            ticket_id: it.ticket_id,
            quantity: it.count,
          })),
          coupon: state.coupon || "",
          buyer,
          customer_email: customerEmail,
          payment_method: { token, installments: 1 },
          acceptance_token: presignedAcceptance!.acceptance_token,
          accept_personal_auth: presignedPrivacy?.acceptance_token,
          currency: state.currency,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || "Error al crear la transacción");
      }
      const txId = result.transaction_id || result.id;
      if (!txId) throw new Error("No se devolvió ID de transacción");
      setTransactionId(txId);
      await pollStatus(txId);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error procesando el pago");
      setStatus("error");
    }
  };

  if (!state) return null;

  const cardType = detectCardType(number);
  const processing =
    status === "tokenizing" ||
    status === "creatingTransaction" ||
    status === "polling";

  if (status === "success") {
    return (
      <ProcessingOverlay
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
            <h1 className="text-3xl font-bold">Pagar con tarjeta</h1>

            <div
              className="relative h-48 rounded-2xl p-6 shadow-2xl overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${primary} 0%, ${darken(primary, 50)} 50%, ${tema.superficie} 100%)`,
              }}
            >
              <div className="absolute top-4 right-4 text-xs uppercase tracking-wider opacity-80">
                {cardType}
              </div>
              <p className="text-lg tracking-widest mt-12 font-mono">
                {number || "•••• •••• •••• ••••"}
              </p>
              <div className="flex justify-between mt-6 text-xs">
                <div>
                  <p className="opacity-60">Titular</p>
                  <p className="font-semibold uppercase">{name || "NOMBRE APELLIDO"}</p>
                </div>
                <div>
                  <p className="opacity-60">Expira</p>
                  <p className="font-semibold">
                    {expMonth || "MM"}/{expYear ? expYear.slice(-2) : "AA"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Field
                label="Número de tarjeta"
                value={number}
                onChange={(v) => setNumber(formatCardNumber(v))}
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                accent={primary}
              />
              <Field
                label="Titular"
                value={name}
                onChange={(v) => setName(v.toUpperCase())}
                placeholder="NOMBRE APELLIDO"
                accent={primary}
              />
              <div className="grid grid-cols-3 gap-3">
                <Field
                  label="Mes"
                  value={expMonth}
                  onChange={(v) => setExpMonth(v.replace(/\D/g, "").slice(0, 2))}
                  placeholder="MM"
                  inputMode="numeric"
                  accent={primary}
                />
                <Field
                  label="Año"
                  value={expYear}
                  onChange={(v) => setExpYear(v.replace(/\D/g, "").slice(0, 4))}
                  placeholder="AA"
                  inputMode="numeric"
                  accent={primary}
                />
                <Field
                  label="CVC"
                  value={cvc}
                  onChange={(v) => setCvc(v.replace(/\D/g, "").slice(0, 4))}
                  placeholder="123"
                  inputMode="numeric"
                  accent={primary}
                />
              </div>
            </div>

            <div className="space-y-2 text-sm pt-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1"
                  style={{ accentColor: primary }}
                />
                <span className="text-gray-300">
                  Acepto el{" "}
                  {presignedAcceptance ? (
                    <a
                      href={presignedAcceptance.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                      style={{ color: primary }}
                    >
                      reglamento de la pasarela
                    </a>
                  ) : (
                    "reglamento"
                  )}
                  .
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  className="mt-1"
                  style={{ accentColor: primary }}
                />
                <span className="text-gray-300">
                  Autorizo el{" "}
                  {presignedPrivacy ? (
                    <a
                      href={presignedPrivacy.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                      style={{ color: primary }}
                    >
                      tratamiento de datos personales
                    </a>
                  ) : (
                    "tratamiento de datos personales"
                  )}
                  .
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || processing}
              className="w-full py-4 rounded-xl font-bold text-lg transition-all hover:enabled:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
              style={
                canSubmit && !processing
                  ? { background: `linear-gradient(135deg, ${primary}, ${darken(primary, 20)})`, color: "#fff", boxShadow: `0 0 20px rgba(${rgb},0.4)` }
                  : { background: `rgba(${rgb},0.15)`, color: "rgba(255,255,255,0.4)", border: `1px solid rgba(${rgb},0.25)`, cursor: "not-allowed" }
              }
            >
              {processing ? processingLabel(status) : "Confirmar compra"}
            </button>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <PaymentSummary state={state} currentStep={3} />
            </div>
          </div>
        </div>
      </div>

      {processing && <ProcessingOverlay title={processingLabel(status)} />}
    </div>
  );
};

const processingLabel = (s: Status) => {
  switch (s) {
    case "tokenizing":
      return "Validando tarjeta...";
    case "creatingTransaction":
      return "Procesando pago...";
    case "polling":
      return "Confirmando con el banco...";
    default:
      return "Procesando...";
  }
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric";
  accent: string;
}
const Field: React.FC<FieldProps> = ({ label, value, onChange, placeholder, inputMode, accent }) => (
  <label className="block">
    <span className="block text-xs uppercase tracking-wider text-gray-400 mb-1 font-bold">
      {label}
    </span>
    <input
      type="text"
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-gray-600 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
      style={{ borderColor: `${accent}80` }}
    />
  </label>
);

interface OverlayProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  color?: string;
}
const ProcessingOverlay: React.FC<OverlayProps> = ({ title, subtitle, emoji, color }) => {
  const tema = useTemaCheckout();
  const tint = color || tema.primario;
  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center" style={{ background: `${tema.fondo}F2` }}>
      <div className="text-center px-6">
        {emoji ? (
          <div
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl font-bold mb-4"
            style={{ backgroundColor: tint }}
          >
            {emoji}
          </div>
        ) : (
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderBottomColor: tint }}></div>
        )}
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-gray-400 mt-2">{subtitle}</p>}
      </div>
    </div>
  );
};

export default PaymentCard;
