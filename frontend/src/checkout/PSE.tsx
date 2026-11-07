import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL, type CheckoutState } from "./types";
import { resolverPrimario, useTemaCheckout } from "./tema";

interface Bank { financial_institution_code: string; financial_institution_name: string }

const PERSON_TYPES = [{ label: "Natural", value: "0" }, { label: "Jurídica", value: "1" }];
const DOC_TYPES = [{ label: "CC", value: "CC" }, { label: "CE", value: "CE" }, { label: "NIT", value: "NIT" }];

function fmtCOP(n: number, currency = "COP") {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency, minimumFractionDigits: 0 }).format(n);
}

type Status = "idle" | "submitting" | "success" | "error";

export default function PaymentPSE() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState | null;
  const tema = useTemaCheckout();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [bankDropOpen, setBankDropOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  const buyer = state?.buyer ?? {};
  const [personType, setPersonType] = useState("0");
  const [docType, setDocType] = useState("CC");
  const [docNumber, setDocNumber] = useState("");
  const [fullName, setFullName] = useState(buyer.full_name ?? "");
  const [email, setEmail] = useState(buyer.email ?? "");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingBanks, setLoadingBanks] = useState(true);

  useEffect(() => {
    if (!state) { navigate("/", { replace: true }); return; }

    fetch(`${API_URL}/wompi/pse/financial_institutions`)
      .then((r) => r.json())
      .then((data) => {
        const raw = data?.financial_institutions ?? data?.data ?? data;
        setBanks(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setBanks([]))
      .finally(() => setLoadingBanks(false));
  }, [state, navigate]);

  if (!state) return null;

  const primary = resolverPrimario(state.primaryColor, tema);
  const rgb = primary.startsWith("#")
    ? `${parseInt(primary.slice(1, 3), 16)},${parseInt(primary.slice(3, 5), 16)},${parseInt(primary.slice(5, 7), 16)}`
    : "90,43,204";
  const fondoRgb = `${parseInt(tema.fondo.slice(1, 3), 16)},${parseInt(tema.fondo.slice(3, 5), 16)},${parseInt(tema.fondo.slice(5, 7), 16)}`;

  const filteredBanks = bankSearch
    ? banks.filter((b) => b.financial_institution_name.toLowerCase().includes(bankSearch.toLowerCase()))
    : banks;

  const canSubmit =
    selectedBank &&
    docNumber.trim().length >= 5 &&
    fullName.trim().length >= 5 &&
    email.includes("@") &&
    status === "idle";

  const handleSubmit = async () => {
    if (!canSubmit || !state) return;
    setStatus("submitting");
    setError(null);

    const redirectUrl = `${window.location.origin}/pago/pse/resultado`;

    try {
      const mergedBuyer = {
        ...buyer,
        full_name: fullName.trim(),
        email: email.trim(),
        legal_id: docNumber.trim(),
        legal_id_type: docType,
      };
      const res = await fetch(`${API_URL}/web/wompi/pse/make_payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: state.eventId,
          redirect_url: redirectUrl,
          financial_institution_code: selectedBank!.financial_institution_code,
          user_type: parseInt(personType, 10),
          user_legal_id_type: docType,
          user_legal_id: docNumber.trim(),
          buyer: mergedBuyer,
          coupon: state.coupon ?? "",
          total_amount: state.total,
          quantity: state.totalTickets,
          selected_tickets: state.items.map((it) => ({
            ticket_id: it.ticket_id,
            quantity: it.count,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error iniciando el pago PSE");

      const pseUrl: string = data.pse_payment_url ?? data.async_payment_url;
      if (!pseUrl) throw new Error("No se recibió la URL de pago PSE");

      // Redirect to bank portal
      window.location.href = pseUrl;
    } catch (e: any) {
      setError(e.message ?? "Error iniciando el pago");
      setStatus("error");
    }
  };

  const inputStyle = (focused = false): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box" as const,
    padding: "12px 14px", background: "rgba(255,255,255,0.05)",
    border: `1.5px solid ${focused ? `rgb(${rgb})` : "rgba(255,255,255,0.1)"}`,
    borderRadius: 12, color: "#fff", fontSize: 14, outline: "none",
  });

  return (
    <div style={{ minHeight: "100vh", background: tema.fondo, color: "#fff", fontFamily: "'Inter',system-ui,sans-serif", paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: `rgba(${fondoRgb},0.96)`, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>←</button>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Pago PSE</p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{state.eventName}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[600px] px-5 py-6 lg:max-w-[720px] lg:px-8">
        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          {["Entradas", "Método", "PSE"].map((label, i) => (
            <React.Fragment key={i}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: i === 2 ? primary : "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: i <= 2 ? "#fff" : "rgba(255,255,255,0.3)" }}>
                  {i < 2 ? "✓" : "3"}
                </div>
                <span style={{ fontSize: 10, color: i === 2 ? `rgb(${rgb})` : "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</span>
              </div>
              {i < 2 && <div style={{ height: 2, flex: 0.6, background: `rgba(${rgb},0.4)`, marginBottom: 20 }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Bank selector */}
        <div style={{ marginBottom: 20, position: "relative", zIndex: 10 }}>
          <Label>Banco</Label>
          <button
            onClick={() => setBankDropOpen((v) => !v)}
            className="campo-checkout"
            style={{ ...inputStyle(bankDropOpen), display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "rgba(255,255,255,0.05)" }}
          >
            <span style={{ color: selectedBank ? "#fff" : "rgba(255,255,255,0.3)" }}>
              {selectedBank ? selectedBank.financial_institution_name : loadingBanks ? "Cargando bancos..." : "Selecciona tu banco"}
            </span>
            <span style={{ fontSize: 12, transform: bankDropOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "rgba(255,255,255,0.4)" }}>▼</span>
          </button>
          {bankDropOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#1a1b2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, overflow: "hidden", zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <input
                  autoFocus
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Buscar banco..."
                  className="campo-checkout"
                  style={{ ...inputStyle(), padding: "8px 12px" }}
                />
              </div>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {filteredBanks.map((b) => (
                  <button key={b.financial_institution_code} onClick={() => { setSelectedBank(b); setBankDropOpen(false); setBankSearch(""); }}
                    className="campo-checkout transition-colors hover:bg-white/[0.06]"
                    style={{ display: "block", width: "100%", padding: "12px 16px", background: selectedBank?.financial_institution_code === b.financial_institution_code ? `rgba(${rgb},0.1)` : "transparent", border: "none", color: "#fff", textAlign: "left", cursor: "pointer", fontSize: 14, fontWeight: selectedBank?.financial_institution_code === b.financial_institution_code ? 700 : 400 }}>
                    {b.financial_institution_name}
                  </button>
                ))}
                {filteredBanks.length === 0 && <p style={{ margin: 0, padding: "12px 16px", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Sin resultados</p>}
              </div>
            </div>
          )}
        </div>

        {/* Person type */}
        <div style={{ marginBottom: 20 }}>
          <Label>Tipo de persona</Label>
          <div style={{ display: "flex", gap: 10 }}>
            {PERSON_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => setPersonType(pt.value)}
                className="campo-checkout transition-colors hover:brightness-110"
                style={{
                  flex: 1, padding: "12px", borderRadius: 12, border: `1.5px solid ${personType === pt.value ? `rgb(${rgb})` : "rgba(255,255,255,0.1)"}`,
                  background: personType === pt.value ? `rgba(${rgb},0.1)` : "rgba(255,255,255,0.05)",
                  color: personType === pt.value ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: personType === pt.value ? 700 : 400, cursor: "pointer", fontSize: 14,
                }}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Doc type + number */}
        <div style={{ marginBottom: 20 }}>
          <Label>Documento</Label>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ display: "flex", gap: 0, border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
              {DOC_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  onClick={() => setDocType(dt.value)}
                  className="campo-checkout transition-colors hover:brightness-110"
                  style={{
                    padding: "12px 14px", border: "none", borderRight: dt.value !== "NIT" ? "1px solid rgba(255,255,255,0.1)" : "none",
                    background: docType === dt.value ? `rgb(${rgb})` : "rgba(255,255,255,0.05)",
                    color: docType === dt.value ? "#fff" : "rgba(255,255,255,0.5)",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}
                >
                  {dt.label}
                </button>
              ))}
            </div>
            <input
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Número de documento"
              inputMode="numeric"
              className="campo-checkout"
              style={{ ...inputStyle(), flex: 1 }}
            />
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <Label>Nombre completo</Label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nombre y apellido"
            className="campo-checkout"
            style={inputStyle()}
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 24 }}>
          <Label>Correo electrónico</Label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            type="email"
            className="campo-checkout"
            style={inputStyle()}
          />
          <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Recibirás la confirmación y tus tickets en este correo.</p>
        </div>

        {/* Order summary */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 18px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 10px 0", fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Resumen del pedido</p>
          {state.items.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{item.count}× {item.ticketName}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtCOP(item.price * item.count, state.currency)}</span>
            </div>
          ))}
          {state.serviceFee > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Tarifa de servicio</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{fmtCOP(state.serviceFee * state.totalTickets, state.currency)}</span>
            </div>
          )}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: 17 }}>{fmtCOP(state.total, state.currency)}</span>
          </div>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 14, color: "#fca5a5" }}>{error}</p>
          </div>
        )}

        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          🔒 Serás redirigido al portal seguro de tu banco para completar el pago.
        </p>
      </div>

      {/* Sticky bottom */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99, background: `rgba(${fondoRgb},0.97)`, backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 20px" }}>
        <div className="mx-auto flex w-full max-w-[600px] items-center gap-3.5 lg:max-w-[720px] lg:px-3">
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Total a pagar</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>{fmtCOP(state.total, state.currency)}</p>
          </div>
          <button
            disabled={!canSubmit || status === "submitting"}
            onClick={handleSubmit}
            className="transition-[filter] hover:enabled:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
            style={{
              padding: "14px 24px", borderRadius: 14, border: "none",
              background: canSubmit ? `linear-gradient(135deg, #0066cc, #004499)` : "rgba(255,255,255,0.08)",
              color: canSubmit ? "#fff" : "rgba(255,255,255,0.3)",
              fontWeight: 800, fontSize: 15, cursor: canSubmit ? "pointer" : "not-allowed",
              flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {status === "submitting" ? (
              <>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Redirigiendo...
              </>
            ) : "Ir al banco →"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{children}</p>;
}
