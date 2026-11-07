import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "./types";
import { hexToRgb, useTemaCheckout } from "./tema";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.atonik.Atonik&hl=es_CO";
const APP_STORE_URL = "https://apps.apple.com/co/app/atonik/id6751009147";
// Página de ayuda genérica de Atonik (no es parte de este sitio, no hay equivalente
// local): se deja como está a propósito, ver README.md "Enlaces que quedan fuera".
const STEPS_URL = "https://atonik-proyect.web.app/steps-activation-code";

interface Code { code: string; used: boolean; ticket_index?: number; ticket_total?: number }
interface StatusResponse {
  status: string;
  wompi_id?: string;
  reference?: string;
  event_name?: string;
  codes: Code[];
  total: number;
}

const TERMINAL_STATUSES = ["APPROVED", "DECLINED", "ERROR", "VOIDED"];
const MAX_ATTEMPTS = 20;

export default function PSEResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wompiId = searchParams.get("id");
  const tema = useTemaCheckout();
  // No hay CheckoutState acá (se llega por redirect del banco): se usa
  // directamente el primario del organizador, como hace el original.
  const primary = tema.primario;
  const rgb = hexToRgb(primary);

  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = async () => {
    if (!wompiId) { setError("ID de transacción no encontrado"); setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/web/wompi/pse/status/${wompiId}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json: StatusResponse = await res.json();
      setData(json);
      attemptsRef.current += 1;

      if (TERMINAL_STATUSES.includes(json.status)) {
        setLoading(false);
      } else if (attemptsRef.current < MAX_ATTEMPTS) {
        timerRef.current = setTimeout(check, 3000);
      } else {
        setLoading(false);
      }
    } catch (e: any) {
      setError(e.message ?? "Error verificando el pago");
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const approved = data?.status === "APPROVED";
  const pending = !data || (!TERMINAL_STATUSES.includes(data.status));
  const codes = data?.codes ?? [];

  const copyCode = async (code: string, idx: number) => {
    try { await navigator.clipboard.writeText(code); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500); } catch {}
  };

  if (!wompiId) {
    return (
      <div style={{ minHeight: "100vh", background: tema.fondo, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", gap: 16 }}>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>ID de transacción no encontrado</p>
        <button onClick={() => navigate("/")} style={{ padding: "12px 24px", borderRadius: 12, background: primary, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>Inicio</button>
      </div>
    );
  }

  const statusColor = approved ? "#10b981" : (pending || loading) ? "#374151" : "#ef4444";

  return (
    <div style={{ minHeight: "100vh", background: tema.fondo, color: "#fff", fontFamily: "'Inter',system-ui,sans-serif", padding: "48px 20px 80px" }}>
      <style>{`@keyframes pse-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* Status icon */}
        <div style={{ width: 80, height: 80, margin: "0 auto 20px", borderRadius: "50%", background: statusColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {(pending || loading) && !approved ? (
            <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.2)", borderTop: "3px solid #fff", borderRadius: "50%", animation: "pse-spin .8s linear infinite" }} />
          ) : (
            <span style={{ fontSize: 36, fontWeight: 900 }}>{approved ? "✓" : "×"}</span>
          )}
        </div>

        <h1 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 24, fontWeight: 800 }}>
          {approved ? "¡Pago aprobado!" : (pending || loading) ? "Verificando pago..." : "Pago no completado"}
        </h1>
        <p style={{ margin: "0 0 32px", textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
          {approved
            ? `Te enviamos tu${codes.length > 1 ? "s" : ""} código${codes.length > 1 ? "s" : ""} de activación al correo. Descarga la app de Atonik para canjear${codes.length > 1 ? "los" : "lo"}.`
            : (pending || loading)
            ? "Estamos confirmando tu pago con el banco. Esto puede tardar unos segundos..."
            : error ?? `Estado: ${data?.status ?? "desconocido"}`}
        </p>

        {/* Activation codes */}
        {approved && codes.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
              Código{codes.length > 1 ? "s" : ""} de activación
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {codes.map((c, i) => (
                <div key={c.code} style={{ background: tema.superficie, border: `1px solid rgba(${rgb},0.4)`, borderRadius: 18, padding: 20 }}>
                  {c.ticket_total && c.ticket_total > 1 && (
                    <p style={{ margin: "0 0 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)" }}>
                      Entrada {c.ticket_index ?? i + 1} / {c.ticket_total}
                    </p>
                  )}
                  <p style={{ margin: "0 0 12px", fontFamily: "monospace", fontSize: 24, letterSpacing: "0.18em", fontWeight: 700, color: tema.acento, textAlign: "center", userSelect: "all", wordBreak: "break-all" }}>
                    {c.code}
                  </p>
                  <button
                    onClick={() => copyCode(c.code, i)}
                    style={{ width: "100%", padding: "10px", borderRadius: 10, background: `rgba(${rgb},0.15)`, border: "none", color: primary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    {copiedIdx === i ? "✓ Copiado" : "Copiar código"}
                  </button>
                  {c.used && <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: 11, color: "#f59e0b" }}>Ya canjeado</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick redeem — deep link a /activate, no existe en este sitio (ver README) */}
        {approved && codes.length > 0 && (
          <a
            href={`/activate?codes=${codes.map(c => c.code).join(",")}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              width: "100%", padding: "16px", marginBottom: 14, borderRadius: 16, boxSizing: "border-box",
              background: `linear-gradient(135deg, ${primary}, ${primary}CC)`,
              color: "#fff", fontWeight: 800, fontSize: 16, textDecoration: "none",
              boxShadow: `0 8px 24px -8px rgba(${rgb},0.6)`,
            }}
          >
            🎟️ Ya tengo la app — canjear ahora
          </a>
        )}

        {/* App download */}
        {approved && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 18, marginBottom: 24 }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>No tengo la app aún</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
                style={{ padding: "12px", borderRadius: 12, background: primary, color: "#fff", textAlign: "center", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Google Play
              </a>
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"
                style={{ padding: "12px", borderRadius: 12, background: "#fff", color: tema.fondo, textAlign: "center", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                App Store
              </a>
            </div>
            <a href={STEPS_URL} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", marginTop: 12, textAlign: "center", fontSize: 12, color: tema.acento, textDecoration: "underline" }}>
              ¿Cómo activar mi código?
            </a>
          </div>
        )}

        {/* Transaction info */}
        {data && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18, marginBottom: 24 }}>
            {data.event_name && <InfoRow label="Evento" value={data.event_name} />}
            <InfoRow label="ID transacción" value={wompiId} mono />
            {data.reference && <InfoRow label="Referencia" value={data.reference} mono />}
            <InfoRow label="Estado" value={data.status} />
          </div>
        )}

        {!loading && (
          <button
            onClick={() => navigate("/")}
            style={{ width: "100%", padding: "14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Volver al inicio
          </button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
      <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.4)", fontWeight: 700, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#fff", fontFamily: mono ? "monospace" : undefined, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
    </div>
  );
}
