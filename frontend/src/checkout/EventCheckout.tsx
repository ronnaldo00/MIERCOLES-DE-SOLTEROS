import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL, type CheckoutState, type FormField } from "./types";
import { RUTAS_CHECKOUT, resolverPrimario, useTemaCheckout } from "./tema";

const DEFAULT_FORM_FIELDS: FormField[] = [
  { name: "full_name", label: "Nombre completo", type: "text", required: true, placeholder: "Juan Pérez" },
  { name: "email", label: "Correo electrónico", type: "email", required: true, placeholder: "tu@correo.com" },
  { name: "phone", label: "WhatsApp", type: "phone", required: true, placeholder: "3001234567" },
];

interface TicketType {
  ticket_id: string;
  name: string;
  price: number;
  available_stock: number;
  is_active: boolean;
  description?: string;
}

interface Stage { name: string; ticket_types: TicketType[]; is_active: boolean }

interface EventFormField { name: string; type: string; required?: boolean; options?: string[] }
interface EventData {
  _id: string;
  general: { name: string };
  design: { mainImage?: string; gallery?: string[]; primaryColor?: string };
  dates: { startDate?: string; dates?: { date: string; startTime?: string }[] };
  location: { place?: string; city?: string };
  stages: Stage[];
  settings?: { service_fee?: number; currency?: string; form_fields?: FormField[]; form?: EventFormField[]; max_tickets?: number };
}

function mapFormType(t: string): FormField["type"] {
  if (t === "age") return "number";
  if (t === "choice") return "select";
  return "text";
}

interface SelectedQty { [ticket_id: string]: number }

function fmtCOP(n: number, currency = "COP") {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency, minimumFractionDigits: 0 }).format(n);
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function darken(hex: string, amount = 60) {
  const clean = hex.replace("#", "");
  return "#" + (clean.match(/.{2}/g) ?? []).map((c) => Math.max(0, parseInt(c, 16) - amount).toString(16).padStart(2, "0")).join("");
}

function formatStartDate(event: EventData) {
  const raw = event.dates?.startDate ?? (event.dates?.dates?.[0]?.date ? `${event.dates.dates[0].date}T${event.dates.dates[0].startTime ?? "00:00"}` : "");
  if (!raw) return "Fecha por confirmar";
  try {
    return new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short" }).format(new Date(raw));
  } catch { return ""; }
}

export default function EventCheckout() {
  const { urlname } = useParams<{ urlname: string }>();
  const navigate = useNavigate();
  const tema = useTemaCheckout();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState<SelectedQty>({});
  const [prefilledQty, setPrefilledQty] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [buyer, setBuyer] = useState<Record<string, string>>({});
  const [buyerErrors, setBuyerErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = sessionStorage.getItem("atonik_checkout_qty");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Object.values(parsed).some((v: any) => v > 0)) {
          setQty(parsed);
          setPrefilledQty(true);
        }
      } catch {}
      sessionStorage.removeItem("atonik_checkout_qty");
    }
  }, []);

  useEffect(() => {
    if (!urlname) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/event/slug/${urlname}`);
        if (!res.ok) throw new Error("Evento no encontrado");
        setEvent(await res.json());
      } finally { setLoading(false); }
    })();
  }, [urlname]);

  const formFields: FormField[] = useMemo(() => {
    const dynamicForm = event?.settings?.form;
    const contactFields: FormField[] = [
      { name: "full_name", label: "Nombre completo", type: "text", required: true, placeholder: "Juan Pérez" },
      { name: "email", label: "Correo electrónico", type: "email", required: true, placeholder: "tu@correo.com" },
      { name: "phone", label: "WhatsApp", type: "phone", required: true, placeholder: "3001234567" },
    ];
    if (dynamicForm?.length) {
      const custom: FormField[] = dynamicForm.map(f => ({
        name: f.name,
        label: f.name,
        type: mapFormType(f.type),
        required: f.required ?? false,
        options: f.options,
      }));
      return [...contactFields, ...custom];
    }
    return DEFAULT_FORM_FIELDS;
  }, [event]);

  const updateBuyer = (name: string, value: string) => {
    setBuyer((p) => ({ ...p, [name]: value }));
    setBuyerErrors((p) => ({ ...p, [name]: "" }));
  };

  const validateBuyer = (): boolean => {
    const errs: Record<string, string> = {};
    for (const f of formFields) {
      const raw = (buyer[f.name] ?? "").trim();
      if (f.required && !raw) {
        errs[f.name] = "Requerido";
        continue;
      }
      if (!raw) continue;
      if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) errs[f.name] = "Email inválido";
      if (f.type === "phone") {
        const digits = raw.replace(/\D/g, "");
        if (digits.length < 10 || !digits.startsWith("3")) errs[f.name] = "Celular inválido (10 dígitos, inicia con 3)";
      }
      if (f.type === "number" && Number.isNaN(Number(raw))) errs[f.name] = "Número inválido";
    }
    setBuyerErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const activeStages = useMemo(() => event?.stages?.filter((s) => s.is_active) ?? [], [event]);
  const inactiveStages = useMemo(() => event?.stages?.filter((s) => !s.is_active) ?? [], [event]);

  // Fallback de color: primero la marca del evento, si no trae, el primario del organizador (tema).
  const primary = resolverPrimario(event?.design?.primaryColor, tema);
  const rgb = primary.startsWith("#") ? hexToRgb(primary) : "90,43,204";
  const fondoRgb = hexToRgb(tema.fondo);
  const currency = event?.settings?.currency ?? "COP";
  const serviceFee = event?.settings?.service_fee ?? 0;
  const maxTickets = (event?.settings as any)?.max_tickets ?? 8;

  const totalTickets = useMemo(() => Object.values(qty).reduce((a, b) => a + b, 0), [qty]);
  const subtotal = useMemo(() => {
    return (event?.stages ?? []).reduce((acc, s) => {
      if (!s.is_active) return acc;
      return acc + s.ticket_types.reduce((a, t) => a + (qty[t.ticket_id] ?? 0) * t.price, 0);
    }, 0);
  }, [qty, event]);
  const total = subtotal + serviceFee * totalTickets;

  const update = (ticket_id: string, delta: number, availableStock: number) => {
    setQty((prev) => {
      const cur = prev[ticket_id] ?? 0;
      if (delta > 0) {
        const currentTotal = Object.values(prev).reduce((a, b) => a + b, 0);
        if (currentTotal >= maxTickets) return prev;
      }
      const next = Math.max(0, Math.min(cur + delta, availableStock));
      return { ...prev, [ticket_id]: next };
    });
  };

  const handleContinue = async () => {
    if (totalTickets === 0 || !event) return;
    if (!validateBuyer()) return;

    if (coupon.trim()) {
      setValidatingCoupon(true);
      setCouponError("");
      try {
        const res = await fetch(`${API_URL}/validate-coupon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coupon: coupon.trim(), eventId: event._id }),
        });
        const data = await res.json();
        if (!data.valid) { setCouponError(data.message || "Código inválido"); setValidatingCoupon(false); return; }
      } catch { setCouponError("Error validando el código"); setValidatingCoupon(false); return; }
      setValidatingCoupon(false);
    }

    const items: import("./types").CheckoutItem[] = [];
    for (const s of event.stages) {
      if (!s.is_active) continue;
      for (const t of s.ticket_types) {
        if ((qty[t.ticket_id] ?? 0) > 0) {
          items.push({ ticket_id: t.ticket_id, stageName: s.name, ticketName: t.name, price: t.price, count: qty[t.ticket_id] ?? 0 });
        }
      }
    }

    const normalizedBuyer: Record<string, string> = {};
    for (const [k, v] of Object.entries(buyer)) {
      const trimmed = (v ?? "").trim();
      if (trimmed) normalizedBuyer[k] = trimmed;
    }
    if (normalizedBuyer.phone) normalizedBuyer.phone = normalizedBuyer.phone.replace(/\D/g, "");

    const state: CheckoutState = {
      eventId: event._id,
      eventName: event.general.name,
      eventImage: event.design.gallery?.[0] ?? event.design.mainImage,
      eventSlug: urlname,
      primaryColor: primary,
      items,
      subtotal,
      serviceFee,
      total,
      totalTickets,
      currency,
      coupon: coupon.trim() || undefined,
      buyer: normalizedBuyer,
    };

    navigate(RUTAS_CHECKOUT.pagoSeleccionar, { state });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: tema.fondo, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTop: `3px solid ${primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!event || activeStages.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: tema.fondo, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", gap: 12 }}>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>{!event ? "Evento no encontrado" : "No hay entradas disponibles"}</p>
        <button onClick={() => navigate(-1)} style={{ padding: "10px 24px", borderRadius: 12, background: primary, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>Volver</button>
      </div>
    );
  }

  const heroImage = event.design.gallery?.[0] ?? event.design.mainImage ?? "";

  return (
    <div style={{ minHeight: "100vh", background: tema.fondo, color: "#fff", fontFamily: "'Inter',system-ui,sans-serif", paddingBottom: 160 }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: `rgba(${fondoRgb},0.96)`, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>←</button>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{event.general.name}</p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{prefilledQty && totalTickets > 0 ? `${totalTickets} entrada${totalTickets > 1 ? "s" : ""} seleccionada${totalTickets > 1 ? "s" : ""}` : "Selecciona tus entradas"}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[600px] px-5 lg:max-w-[1160px] lg:px-8">
      <div className="lg:grid lg:grid-cols-[1fr_400px] lg:items-start lg:gap-10">
      <div className="lg:min-w-0">
        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 24, marginBottom: 28 }}>
          {["Entradas", "Método de pago", "Confirmación"].map((label, i) => (
            <React.Fragment key={i}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: i === 0 ? primary : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: i === 0 ? "#fff" : "rgba(255,255,255,0.3)" }}>{i + 1}</div>
                <span style={{ fontSize: 10, color: i === 0 ? `rgb(${rgb})` : "rgba(255,255,255,0.3)", fontWeight: 600, textAlign: "center" }}>{label}</span>
              </div>
              {i < 2 && <div style={{ height: 2, flex: 0.6, background: "rgba(255,255,255,0.1)", marginBottom: 20 }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Hero card */}
        <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", height: 140, marginBottom: 24 }}>
          {heroImage && <img src={heroImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.7) 40%, transparent)" }} />
          <div style={{ position: "absolute", bottom: 16, left: 16, right: 80 }}>
            <p style={{ margin: "0 0 4px 0", fontWeight: 800, fontSize: 16 }}>{event.general.name}</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {event.location.place && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>📍 {event.location.place}</span>}
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>📅 {formatStartDate(event)}</span>
            </div>
          </div>
        </div>

        {/* Tickets */}
        {prefilledQty && totalTickets > 0 ? (
          <div style={{ marginBottom: 24, padding: "16px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Entradas</p>
              <button onClick={() => setPrefilledQty(false)} style={{ fontSize: 12, color: `rgb(${rgb})`, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>Modificar</button>
            </div>
            {activeStages.flatMap(stage => stage.ticket_types.filter(t => (qty[t.ticket_id] ?? 0) > 0).map(t => (
              <div key={t.ticket_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6, color: "rgba(255,255,255,0.85)" }}>
                <span>{qty[t.ticket_id]}× {t.name} <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>({stage.name})</span></span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCOP(t.price * (qty[t.ticket_id] ?? 0), currency)}</span>
              </div>
            )))}
          </div>
        ) : (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Entradas</p>
              {maxTickets < 99 && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Máx {maxTickets} por compra</span>}
            </div>
            <p style={{ margin: "0 0 16px 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Usa los botones + y − para elegir la cantidad</p>

            {activeStages.map((stage) => (
              <div key={stage.name} style={{ marginBottom: 20 }}>
                {(activeStages.length > 1 || inactiveStages.length > 0) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{stage.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" as const }}>Disponible</span>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {stage.ticket_types.map((t) => {
                    const count = qty[t.ticket_id] ?? 0;
                    const soldOut = t.available_stock === 0 || !t.is_active;
                    const lowStock = !soldOut && t.available_stock <= 10;
                    const maxReached = count >= t.available_stock || totalTickets >= maxTickets;
                    return (
                      <div key={t.ticket_id} style={{
                        background: "rgba(255,255,255,0.04)", border: `1px solid ${count > 0 ? `rgb(${rgb})` : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 16, padding: "16px", opacity: soldOut ? 0.45 : 1, transition: "border-color 0.2s",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div style={{ flex: 1, marginRight: 12 }}>
                            <p style={{ margin: "0 0 3px 0", fontWeight: 700, fontSize: 16 }}>{t.name}</p>
                            {t.description && <p style={{ margin: "0 0 4px 0", fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{t.description}</p>}
                          </div>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: "#fff", flexShrink: 0 }}>{fmtCOP(t.price, currency)}</p>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            {soldOut ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "3px 8px", borderRadius: 6 }}>Agotado</span>
                            ) : lowStock ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#f97316", background: "rgba(249,115,22,0.1)", padding: "3px 8px", borderRadius: 6 }}>¡Quedan {t.available_stock}!</span>
                            ) : (
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{t.available_stock} disponibles</span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "6px 10px" }}>
                            <button disabled={count === 0 || soldOut} onClick={() => update(t.ticket_id, -1, t.available_stock)}
                              className="transition-[filter] hover:enabled:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
                              style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: count === 0 ? "transparent" : `rgba(${rgb},0.2)`, color: count === 0 ? "rgba(255,255,255,0.2)" : `rgb(${rgb})`, cursor: count === 0 || soldOut ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 18 }}>−</button>
                            <span style={{ fontWeight: 700, fontSize: 16, minWidth: 20, textAlign: "center" }}>{count}</span>
                            <button disabled={soldOut || maxReached} onClick={() => update(t.ticket_id, 1, t.available_stock)}
                              className="transition-[filter] hover:enabled:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
                              style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: maxReached || soldOut ? "transparent" : `rgba(${rgb},0.2)`, color: maxReached || soldOut ? "rgba(255,255,255,0.2)" : `rgb(${rgb})`, cursor: soldOut || maxReached ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 18 }}>+</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {inactiveStages.length > 0 && (
              <div style={{ marginTop: 4, opacity: 0.6 }}>
                <p style={{ margin: "0 0 8px 0", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Etapas anteriores</p>
                {inactiveStages.map((stage) => (
                  <div key={stage.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>{stage.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" as const }}>Agotada</span>
                    </div>
                    {stage.ticket_types.map((t) => (
                      <div key={t.ticket_id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{t.name}</span>
                        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", textDecoration: "line-through" }}>{fmtCOP(t.price, currency)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Buyer form */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>Tus datos</p>
          <p style={{ margin: "0 0 14px 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            Recibirás tu código de activación por correo. Descarga la app de Atonik para canjearlo.
          </p>
          {/* Dos columnas desde lg (nombre/correo, etc.) — el orden en el DOM
              no cambia, así que el tabulador sigue el mismo recorrido. */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-x-5 lg:gap-y-4">
            {formFields.map((f) => {
              const val = buyer[f.name] ?? "";
              const err = buyerErrors[f.name];
              const inputStyle: React.CSSProperties = {
                width: "100%", boxSizing: "border-box", padding: "12px 16px",
                background: "rgba(255,255,255,0.05)",
                border: `1.5px solid ${err ? "#ef4444" : val ? `rgb(${rgb})` : "rgba(255,255,255,0.1)"}`,
                borderRadius: 12, color: "#fff", fontSize: 14, outline: "none",
              };
              const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
                value: val,
                placeholder: f.placeholder ?? f.label,
                onChange: (e) => {
                  let v = e.target.value;
                  if (f.type === "phone") v = v.replace(/\D/g, "").slice(0, 10);
                  if (f.type === "number") v = v.replace(/\D/g, "").slice(0, 3);
                  updateBuyer(f.name, v);
                },
                style: inputStyle,
                className: "campo-checkout",
              };
              if (f.type === "email") inputProps.type = "email";
              else if (f.type === "phone") { inputProps.type = "tel"; inputProps.inputMode = "numeric"; }
              else if (f.type === "number") { inputProps.type = "text"; inputProps.inputMode = "numeric"; inputProps.pattern = "[0-9]*"; }
              else if (f.type === "date") inputProps.type = "date";
              else inputProps.type = "text";

              return (
                <div key={f.name}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
                    {f.label}{f.required ? " *" : ""}
                  </label>
                  {f.type === "select" && f.options?.length ? (
                    <select
                      value={val}
                      onChange={(e) => updateBuyer(f.name, e.target.value)}
                      className="campo-checkout"
                      style={{ ...inputStyle, appearance: "none" as any }}
                    >
                      <option value="" style={{ background: tema.fondo }}>Selecciona…</option>
                      {f.options.map((o) => <option key={o} value={o} style={{ background: tema.fondo }}>{o}</option>)}
                    </select>
                  ) : (
                    <input {...inputProps} />
                  )}
                  {err && <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#ef4444" }}>{err}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coupon */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 700 }}>Código de promotor</p>
          <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Si alguien te compartió un código, ingrésalo aquí</p>
          <input
            value={coupon}
            onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponError(""); }}
            placeholder="Ej: PROMOTOR2025"
            className="campo-checkout lg:max-w-sm"
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: `1.5px solid ${coupon ? `rgb(${rgb})` : "rgba(255,255,255,0.1)"}`, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }}
          />
          {couponError && <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#ef4444" }}>{couponError}</p>}
        </div>

        {/* Guide */}
        <div style={{ background: `rgba(${rgb},0.05)`, border: `1px solid rgba(${rgb},0.15)`, borderRadius: 16, padding: 16, marginBottom: 24 }}>
          <p style={{ margin: "0 0 12px 0", fontSize: 13, fontWeight: 700 }}>¿Cómo comprar?</p>
          {[
            { icon: "🎟️", title: "1. Elige tus entradas", desc: "Selecciona el tipo y cantidad." },
            { icon: "💳", title: "2. Paga de forma segura", desc: "Nequi o PSE. Rápido y sin complicaciones." },
            { icon: "📱", title: "3. Descarga la app y canjea", desc: "Te enviamos un código por correo. Úsalo en la app de Atonik para activar tu boleta." },
          ].map((step, i, arr) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `rgba(${rgb},0.15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{step.icon}</div>
                <div style={{ paddingTop: 4 }}>
                  <p style={{ margin: "0 0 2px 0", fontSize: 13, fontWeight: 600 }}>{step.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{step.desc}</p>
                </div>
              </div>
              {i < arr.length - 1 && <div style={{ width: 1.5, height: 12, background: `rgba(${rgb},0.2)`, marginLeft: 15, marginBlock: 4 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Resumen pegajoso — sólo escritorio (lg:). En móvil el resumen y el
          botón de continuar siguen viviendo en la barra inferior fija. */}
      <div className="hidden lg:block">
        <div
          className="lg:sticky lg:top-24"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            {heroImage && (
              <img src={heroImage} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: `rgb(${rgb})` }}>Evento</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.general.name}</p>
            </div>
          </div>

          {totalTickets > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 16, marginBottom: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              {activeStages.flatMap((stage) =>
                stage.ticket_types
                  .filter((t) => (qty[t.ticket_id] ?? 0) > 0)
                  .map((t) => (
                    <div key={t.ticket_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                      <span>{qty[t.ticket_id]}× {t.name}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCOP(t.price * (qty[t.ticket_id] ?? 0), currency)}</span>
                    </div>
                  )),
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>Todavía no has elegido entradas.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {totalTickets > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  <span>Subtotal</span>
                  <span>{fmtCOP(subtotal, currency)}</span>
                </div>
                {serviceFee > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                    <span>Tarifa de servicio</span>
                    <span>{fmtCOP(serviceFee * totalTickets, currency)}</span>
                  </div>
                )}
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, marginTop: totalTickets > 0 ? 2 : 0, borderTop: totalTickets > 0 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 20 }}>{fmtCOP(total, currency)}</span>
            </div>
          </div>

          <button
            disabled={totalTickets === 0 || validatingCoupon}
            onClick={handleContinue}
            className="transition-[filter] hover:enabled:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
            style={{
              width: "100%", marginTop: 20, padding: "16px", borderRadius: 14, border: "none",
              background: totalTickets > 0 ? `linear-gradient(135deg, ${primary}, ${darken(primary, 30)})` : "rgba(255,255,255,0.08)",
              color: totalTickets > 0 ? "#fff" : "rgba(255,255,255,0.3)",
              fontWeight: 800, fontSize: 16, cursor: totalTickets > 0 ? "pointer" : "not-allowed",
              boxShadow: totalTickets > 0 ? `0 4px 24px rgba(${rgb},0.3)` : "none",
            }}
          >
            {validatingCoupon ? "Validando código..." : totalTickets === 0 ? "Selecciona entradas" : "Continuar →"}
          </button>
        </div>
      </div>
      </div>
      </div>

      {/* Sticky bottom — sólo móvil/tablet; en lg el resumen de la derecha lo reemplaza */}
      <div className="lg:hidden" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99,
        background: `rgba(${fondoRgb},0.97)`, backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 20px",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          {totalTickets > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{totalTickets} entrada{totalTickets > 1 ? "s" : ""}</span>
                {serviceFee > 0 && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>+ {fmtCOP(serviceFee * totalTickets, currency)} tarifa</span>}
              </div>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{fmtCOP(total, currency)}</span>
            </div>
          )}
          <button
            disabled={totalTickets === 0 || validatingCoupon}
            onClick={handleContinue}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
            style={{
              width: "100%", padding: "16px", borderRadius: 14, border: "none",
              background: totalTickets > 0 ? `linear-gradient(135deg, ${primary}, ${darken(primary, 30)})` : "rgba(255,255,255,0.08)",
              color: totalTickets > 0 ? "#fff" : "rgba(255,255,255,0.3)",
              fontWeight: 800, fontSize: 16, cursor: totalTickets > 0 ? "pointer" : "not-allowed",
              boxShadow: totalTickets > 0 ? `0 4px 24px rgba(${rgb},0.3)` : "none",
            }}
          >
            {validatingCoupon ? "Validando código..." : totalTickets === 0 ? "Selecciona entradas" : "Continuar →"}
          </button>
        </div>
      </div>
    </div>
  );
}
