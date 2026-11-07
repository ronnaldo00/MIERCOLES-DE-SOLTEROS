import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL, type CheckoutState } from "./types";
import { RUTAS_CHECKOUT, resolverPrimario, useTemaCheckout } from "./tema";

function fmtCOP(n: number, currency = "COP") {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency, minimumFractionDigits: 0 }).format(n);
}

export default function PaymentSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState | null;
  const tema = useTemaCheckout();

  const [selected, setSelected] = useState<"nequi" | "pse">("nequi");
  const [checks, setChecks] = useState({ terms: false, privacy: false });
  const [presignedLinks, setPresignedLinks] = useState<{ termsUrl: string; privacyUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state) { navigate("/", { replace: true }); return; }

    fetch(`${API_URL}/wompi/presigned_acceptance`)
      .then((r) => r.json())
      .then((data) => {
        const terms = data?.presigned_acceptance?.permalink ?? data?.data?.presigned_acceptance?.permalink ?? "";
        const privacy = data?.presigned_personal_data_auth?.permalink ?? data?.data?.presigned_personal_data_auth?.permalink ?? "";
        if (terms || privacy) setPresignedLinks({ termsUrl: terms, privacyUrl: privacy });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [state, navigate]);

  if (!state) return null;

  const primary = resolverPrimario(state.primaryColor, tema);
  const rgb = primary.startsWith("#")
    ? `${parseInt(primary.slice(1, 3), 16)},${parseInt(primary.slice(3, 5), 16)},${parseInt(primary.slice(5, 7), 16)}`
    : "90,43,204";
  const fondoRgb = `${parseInt(tema.fondo.slice(1, 3), 16)},${parseInt(tema.fondo.slice(3, 5), 16)},${parseInt(tema.fondo.slice(5, 7), 16)}`;
  const canContinue = checks.terms && checks.privacy;

  const handleNext = () => {
    if (!canContinue) return;
    const nextState: CheckoutState = { ...state, gateway: selected };
    if (selected === "pse") {
      navigate(RUTAS_CHECKOUT.pagoPSE, { state: nextState });
    } else {
      navigate(RUTAS_CHECKOUT.pagoNequi, { state: nextState });
    }
  };

  const methods = [
    {
      id: "nequi" as const,
      label: "Nequi",
      sub: "Pago push a tu celular — sin datos de tarjeta",
      badge: "⭐ Recomendado",
      icon: (
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(219,0,130,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💜</div>
      ),
    },
    {
      id: "pse" as const,
      label: "PSE — Transferencia bancaria",
      sub: "Paga desde tu banco directamente",
      badge: null,
      icon: (
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(0,102,204,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏦</div>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: tema.fondo, color: "#fff", fontFamily: "'Inter',system-ui,sans-serif", paddingBottom: 160 }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: `rgba(${fondoRgb},0.96)`, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>←</button>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Método de pago</p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{state.eventName}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[600px] px-5 lg:max-w-[720px] lg:px-8">
        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 24, marginBottom: 28 }}>
          {["Entradas", "Método de pago", "Confirmación"].map((label, i) => (
            <React.Fragment key={i}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: i === 1 ? primary : i === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: i <= 1 ? "#fff" : "rgba(255,255,255,0.3)" }}>
                  {i === 0 ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 10, color: i === 1 ? `rgb(${rgb})` : i === 0 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)", fontWeight: 600, textAlign: "center" }}>{label}</span>
              </div>
              {i < 2 && <div style={{ height: 2, flex: 0.6, background: i === 0 ? `rgba(${rgb},0.4)` : "rgba(255,255,255,0.1)", marginBottom: 20 }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Order summary */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 18px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Resumen</p>
          {state.items.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{item.count}× {item.ticketName}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtCOP(item.price * item.count, state.currency)}</span>
            </div>
          ))}
          {state.serviceFee > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Tarifa de servicio ({state.totalTickets})</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{fmtCOP(state.serviceFee * state.totalTickets, state.currency)}</span>
            </div>
          )}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{fmtCOP(state.total, state.currency)}</span>
          </div>
        </div>

        {/* Methods */}
        <p style={{ margin: "0 0 14px 0", fontSize: 16, fontWeight: 700 }}>Añade un método de pago</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className="transition-[filter,border-color] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
                background: selected === m.id ? `rgba(${rgb},0.08)` : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${selected === m.id ? `rgb(${rgb})` : "rgba(255,255,255,0.08)"}`,
                borderRadius: 16, cursor: "pointer", textAlign: "left", transition: "all 0.2s", width: "100%",
              }}
            >
              {m.icon}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{m.label}</span>
                  {m.badge && <span style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "2px 8px", borderRadius: 10 }}>{m.badge}</span>}
                </div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{m.sub}</span>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${selected === m.id ? `rgb(${rgb})` : "rgba(255,255,255,0.3)"}`, background: selected === m.id ? `rgb(${rgb})` : "transparent", flexShrink: 0, transition: "all 0.2s" }} />
            </button>
          ))}
        </div>

        {/* Terms checkboxes */}
        {!loading && (
          <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { key: "terms" as const, label: "Acepto los", linkLabel: "términos y condiciones de Wompi", url: presignedLinks?.termsUrl },
              { key: "privacy" as const, label: "Acepto la", linkLabel: "política de privacidad", url: presignedLinks?.privacyUrl },
            ].map((item) => (
              <label key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <div
                  onClick={() => setChecks((p) => ({ ...p, [item.key]: !p[item.key] }))}
                  style={{
                    width: 20, height: 20, borderRadius: 6, border: `2px solid ${checks[item.key] ? `rgb(${rgb})` : "rgba(255,255,255,0.25)"}`,
                    background: checks[item.key] ? `rgb(${rgb})` : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {checks[item.key] && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                  {item.label}{" "}
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: `rgb(${rgb})`, textDecoration: "underline" }}>{item.linkLabel}</a>
                  ) : (
                    <span style={{ color: `rgb(${rgb})` }}>{item.linkLabel}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Security note */}
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", marginBottom: 0 }}>🔒 Pago 100% seguro procesado por Wompi</p>
      </div>

      {/* Sticky bottom */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99, background: `rgba(${fondoRgb},0.97)`, backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 20px" }}>
        <div className="mx-auto flex w-full max-w-[600px] items-center gap-3.5 lg:max-w-[720px] lg:px-3">
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Total</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>{fmtCOP(state.total, state.currency)}</p>
          </div>
          <button
            disabled={!canContinue}
            onClick={handleNext}
            className="transition-[filter] hover:enabled:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
            style={{
              padding: "14px 28px", borderRadius: 14, border: "none",
              background: canContinue ? `linear-gradient(135deg, ${primary}, ${primary}99)` : "rgba(255,255,255,0.08)",
              color: canContinue ? "#fff" : "rgba(255,255,255,0.3)",
              fontWeight: 800, fontSize: 15, cursor: canContinue ? "pointer" : "not-allowed",
              flexShrink: 0, boxShadow: canContinue ? `0 4px 24px rgba(${rgb},0.3)` : "none",
            }}
          >
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
}
