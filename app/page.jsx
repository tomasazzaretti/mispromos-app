"use client";

// frontend/MisPromos.jsx
// Versión conectada a la API real (ya no usa datos mock ni window.storage).
// Para usarlo en un proyecto Next.js real: copiarlo como app/page.tsx (o un
// componente cliente que renderice ese page.tsx) — necesita que existan
// lib/supabase-browser.ts y las rutas app/api/catalogos, app/api/perfil,
// app/api/promos, app/api/promos/today, app/api/interacciones y
// app/auth/callback.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Fuel, ShoppingCart, Shirt, Pill, UtensilsCrossed, Smartphone as PhoneIcon,
  Settings, Mail, Bell, Heart, X, Check, ChevronRight, ChevronLeft,
  Calendar, TrendingDown, LogOut, ShoppingBag, Sparkles, Home, Plane
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Los íconos son fijos por rubro (lucide), el nombre visible viene del catálogo.
const RUBRO_ICONS = {
  combustible: Fuel,
  supermercado: ShoppingCart,
  indumentaria: Shirt,
  farmacia: Pill,
  gastronomia: UtensilsCrossed,
  tecnologia: PhoneIcon,
  accesorios: ShoppingBag,
  belleza: Sparkles,
  bazar: Home,
  turismo: Plane,
};

function rubroInfo(slug, rubrosCatalogo) {
  const nombre = rubrosCatalogo.find((r) => r.slug === slug)?.nombre ?? slug;
  const Icon = RUBRO_ICONS[slug] ?? ShoppingCart;
  return { label: nombre, Icon };
}

// Fecha (dentro de esta semana) cuyo día de la semana coincide con `dow`.
// Sirve para el "simulador de día": la API real filtra por fecha concreta,
// no por día de la semana suelto como hacía el mock.
function fechaParaDia(dow) {
  const hoy = new Date();
  const target = new Date(hoy);
  target.setDate(hoy.getDate() + (dow - hoy.getDay()));
  return target.toISOString().slice(0, 10);
}

const toggle = (arr, setArr, val) =>
  setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

    .mp-root {
      --ink: #16302E;
      --ink-soft: #4A5F5C;
      --amber: #D9A441;
      --amber-deep: #B5822A;
      --sage: #4C7A72;
      --rust: #B54A34;
      --paper: #EEF0E9;
      --card: #FBFBF8;
      --line: #DADFD5;
      font-family: 'IBM Plex Sans', sans-serif;
      background: var(--paper);
      color: var(--ink);
      min-height: 100%;
      width: 100%;
      box-sizing: border-box;
    }
    .mp-root * { box-sizing: border-box; }
    .mp-display { font-family: 'Fraunces', serif; }

    .mp-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 999px;
      border: 1.5px solid var(--line); background: var(--card);
      font-size: 13.5px; font-weight: 500; color: var(--ink-soft);
      cursor: pointer; transition: border-color .15s, color .15s, background .15s;
      user-select: none;
    }
    .mp-chip:hover { border-color: var(--sage); }
    .mp-chip.active {
      background: var(--ink); border-color: var(--ink); color: var(--card);
    }

    .mp-btn {
      font-family: 'IBM Plex Sans', sans-serif; font-weight: 600; font-size: 14px;
      border-radius: 10px; border: none; cursor: pointer;
      padding: 12px 22px; transition: transform .1s, opacity .15s;
    }
    .mp-btn:active { transform: scale(0.98); }
    .mp-btn:disabled { opacity: .5; cursor: not-allowed; }
    .mp-btn-primary { background: var(--ink); color: var(--card); }
    .mp-btn-primary:hover { opacity: .9; }
    .mp-btn-ghost { background: transparent; color: var(--ink-soft); border: 1.5px solid var(--line); }
    .mp-btn-ghost:hover { border-color: var(--ink-soft); color: var(--ink); }

    .mp-card {
      background: var(--card); border: 1px solid var(--line); border-radius: 14px;
    }

    .mp-input {
      width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line);
      font-size: 14px; font-family: 'IBM Plex Sans', sans-serif; background: var(--card); color: var(--ink);
    }
    .mp-input:focus { outline: none; border-color: var(--sage); }

    .mp-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .mp-scroll::-webkit-scrollbar-thumb { background: var(--line); border-radius: 3px; }

    button:focus-visible, .mp-chip:focus-visible { outline: 2px solid var(--sage); outline-offset: 2px; }
  `}</style>
);

// ---------------------------------------------------------------------------
// Login (código por email — sin contraseña)
//
// El largo del código lo define la config de Auth > Email en el dashboard
// de Supabase (no siempre son 6 dígitos), así que el input no asume una
// longitud fija. Antes mandaba un magic link, pero el código no depende del
// navegador/dispositivo que lo pidió (a diferencia del link, que se rompe
// si se pide en un dispositivo y se abre en otro). El link de /auth/callback
// se deja como fallback si el template de mail todavía lo incluye.
// ---------------------------------------------------------------------------
function Login() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("email"); // "email" | "code"
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (error) {
      setError(
        error.code === "over_email_send_rate_limit"
          ? "Ya te mandamos un código hace muy poco. Esperá un minuto y volvé a pedirlo."
          : "No pudimos enviar el código. Probá de nuevo."
      );
      return;
    }
    setStep("code");
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabaseBrowser().auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    setLoading(false);
    if (error) {
      setError("Código incorrecto o vencido. Probá de nuevo.");
      return;
    }
    // La sesión queda seteada en el cliente; el listener de onAuthStateChange
    // se encarga de sacar el Login y mostrar el feed.
  };

  if (step === "code") {
    return (
      <div style={{ maxWidth: 380, margin: "0 auto", padding: "96px 20px" }}>
        <div className="mp-display" style={{ fontSize: 15, color: "var(--sage)", fontWeight: 500 }}>MisPromos</div>
        <div className="mp-display" style={{ fontSize: 28, fontWeight: 600, marginTop: 4, marginBottom: 8 }}>
          Ingresá el código
        </div>
        <div style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 24 }}>
          Te mandamos un código a <strong>{email}</strong>.
        </div>
        <form onSubmit={handleVerifyCode}>
          <input
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={10} required autoFocus
            placeholder="Código" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="mp-input"
            style={{ marginBottom: 12, letterSpacing: 6, textAlign: "center", fontSize: 20 }}
          />
          {error && <div style={{ fontSize: 12.5, color: "var(--rust)", marginBottom: 12 }}>{error}</div>}
          <button
            type="submit" className="mp-btn mp-btn-primary"
            disabled={loading || code.length < 6}
            style={{ width: "100%", marginBottom: 10 }}
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
          <button
            type="button" className="mp-btn mp-btn-ghost" style={{ width: "100%" }}
            onClick={() => { setStep("email"); setCode(""); setError(""); }}
          >
            Usar otro email
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 380, margin: "0 auto", padding: "96px 20px" }}>
      <div className="mp-display" style={{ fontSize: 15, color: "var(--sage)", fontWeight: 500 }}>MisPromos</div>
      <div className="mp-display" style={{ fontSize: 28, fontWeight: 600, marginTop: 4, marginBottom: 8 }}>
        Entrá con tu email
      </div>
      <div style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 24 }}>
        Sin contraseña: te mandamos un código de acceso.
      </div>
      <form onSubmit={handleSendCode}>
        <input
          type="email" required autoFocus placeholder="tu@email.com" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mp-input" style={{ marginBottom: 12 }}
        />
        {error && <div style={{ fontSize: 12.5, color: "var(--rust)", marginBottom: 12 }}>{error}</div>}
        <button type="submit" className="mp-btn mp-btn-primary" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Enviando..." : "Mandarme el código"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------
function Onboarding({ catalogos, onFinish }) {
  const [step, setStep] = useState(0);
  const [entidadIds, setEntidadIds] = useState([]);
  const [rubroIds, setRubroIds] = useState([]);
  const [canal, setCanal] = useState({ email: true, push: true });
  const [guardando, setGuardando] = useState(false);

  const steps = [
    {
      title: "¿Qué bancos o billeteras usás?",
      sub: "Vamos a mostrarte solo los beneficios que realmente podés aprovechar.",
      body: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {catalogos.entidades.map((e) => (
            <div key={e.id} className={`mp-chip ${entidadIds.includes(e.id) ? "active" : ""}`}
              onClick={() => toggle(entidadIds, setEntidadIds, e.id)}>
              {entidadIds.includes(e.id) && <Check size={14} />}
              {e.nombre}
            </div>
          ))}
        </div>
      ),
      valid: entidadIds.length > 0,
    },
    {
      title: "¿En qué te interesa ahorrar?",
      sub: "Elegí los rubros que te importan. Podés cambiar esto cuando quieras.",
      body: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {catalogos.rubros.map((r) => {
            const Icon = RUBRO_ICONS[r.slug] ?? ShoppingCart;
            const active = rubroIds.includes(r.id);
            return (
              <div key={r.id} onClick={() => toggle(rubroIds, setRubroIds, r.id)}
                className="mp-card"
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
                  cursor: "pointer",
                  borderColor: active ? "var(--ink)" : "var(--line)",
                  background: active ? "var(--ink)" : "var(--card)",
                  color: active ? "var(--card)" : "var(--ink)",
                  transition: "all .15s",
                }}>
                <Icon size={18} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{r.nombre}</span>
              </div>
            );
          })}
        </div>
      ),
      valid: rubroIds.length > 0,
    },
    {
      title: "¿Cómo querés que te avisemos?",
      sub: "Podés elegir uno o los dos canales.",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { key: "email", label: "Email", desc: "Un resumen cuando aparezca algo para vos.", icon: Mail },
            { key: "push", label: "Notificación push", desc: "Aviso el mismo día que la promo está activa (próximamente).", icon: Bell },
          ].map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="mp-card" onClick={() => setCanal({ ...canal, [key]: !canal[key] })}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", cursor: "pointer",
                borderColor: canal[key] ? "var(--sage)" : "var(--line)",
              }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
                background: canal[key] ? "var(--sage)" : "var(--paper)", color: canal[key] ? "#fff" : "var(--ink-soft)", flexShrink: 0,
              }}><Icon size={17} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{label}</div>
                <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{desc}</div>
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${canal[key] ? "var(--sage)" : "var(--line)"}`,
                background: canal[key] ? "var(--sage)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>{canal[key] && <Check size={13} color="#fff" />}</div>
            </div>
          ))}
        </div>
      ),
      valid: canal.email || canal.push,
    },
  ];

  const cur = steps[step];

  const finalizar = async () => {
    setGuardando(true);
    await onFinish({
      entidad_ids: entidadIds,
      rubro_ids: rubroIds,
      notif_email: canal.email,
      notif_push: canal.push,
    });
    setGuardando(false);
  };

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "48px 20px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 2,
            background: i <= step ? "var(--ink)" : "var(--line)", transition: "background .2s",
          }} />
        ))}
      </div>
      <div className="mp-display" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.25, marginBottom: 8 }}>
        {cur.title}
      </div>
      <div style={{ fontSize: 14.5, color: "var(--ink-soft)", marginBottom: 28 }}>{cur.sub}</div>
      {cur.body}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36 }}>
        {step > 0 ? (
          <button className="mp-btn mp-btn-ghost" onClick={() => setStep(step - 1)}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ChevronLeft size={16} /> Atrás</span>
          </button>
        ) : <div />}
        <button
          className="mp-btn mp-btn-primary"
          disabled={!cur.valid || guardando}
          style={{ opacity: cur.valid ? 1 : 0.4, cursor: cur.valid ? "pointer" : "not-allowed" }}
          onClick={() => {
            if (step < steps.length - 1) setStep(step + 1);
            else finalizar();
          }}
        >
          {step < steps.length - 1 ? "Siguiente" : guardando ? "Guardando..." : "Empezar a ahorrar"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de promo
// ---------------------------------------------------------------------------
function PromoCard({ promo, isToday, saved, activeEntidad, rubrosCatalogo, onSave, onDismiss }) {
  const { label, Icon } = rubroInfo(promo.rubro, rubrosCatalogo);

  return (
    <div className="mp-card" style={{
      padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start",
      opacity: activeEntidad ? 1 : 0.55,
      borderColor: isToday ? "var(--amber)" : "var(--line)",
      borderWidth: isToday ? 1.5 : 1,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: "var(--paper)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--sage)",
      }}><Icon size={19} /></div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          {promo.descuento_pct != null && (
            <span className="mp-display" style={{ fontSize: 20, fontWeight: 600, color: "var(--amber-deep)" }}>
              {promo.descuento_pct}%
            </span>
          )}
          {promo.cuotas_sin_interes != null && (
            <span className="mp-display" style={{ fontSize: promo.descuento_pct != null ? 14 : 20, fontWeight: 600, color: "var(--sage)" }}>
              {promo.cuotas_sin_interes} cuotas sin interés
            </span>
          )}
          <span style={{ fontSize: 14, fontWeight: 500 }}>{promo.comercio}</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>
          {[promo.entidad ?? "Promo directa", promo.medio_pago, label].filter(Boolean).join(" · ")}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span>{promo.tope_reintegro ? `Tope $${Number(promo.tope_reintegro).toLocaleString("es-AR")}/mes` : "Sin tope conocido"}</span>
          <span>{(promo.dias_semana ?? []).map((d) => DIAS[d].slice(0, 3)).join(", ")}</span>
          {promo.fiabilidad_pct != null && (
            <span style={{
              color: promo.fiabilidad_pct >= 80 ? "var(--sage)" : promo.fiabilidad_pct >= 50 ? "var(--amber-deep)" : "var(--rust)",
              fontWeight: 600,
            }}>
              Fiabilidad de datos {promo.fiabilidad_pct}%
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <button onClick={() => onSave(promo.id)} title="Me interesa"
          style={{
            width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--line)",
            background: saved ? "var(--sage)" : "var(--card)", color: saved ? "#fff" : "var(--ink-soft)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
          <Heart size={15} fill={saved ? "#fff" : "none"} />
        </button>
        <button onClick={() => onDismiss(promo.id)} title="No me interesa"
          style={{
            width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--line)",
            background: "var(--card)", color: "var(--ink-soft)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feed principal
// ---------------------------------------------------------------------------
function Feed({ perfil, catalogos, onOpenSettings, onLogout }) {
  const [tab, setTab] = useState("hoy");
  const [rubroFiltro, setRubroFiltro] = useState("todos");
  const [simDay, setSimDay] = useState(new Date().getDay());
  const [promosHoy, setPromosHoy] = useState([]);
  const [promosSemana, setPromosSemana] = useState([]);
  const [promosTodas, setPromosTodas] = useState([]);
  const [guardadas, setGuardadas] = useState(new Set());
  const [descartadas, setDescartadas] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // catálogo día-independiente: tus rubros / todas + interacciones, una vez.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [rSemana, rTodas, rInter] = await Promise.all([
          fetch("/api/promos?scope=semana"),
          fetch("/api/promos?scope=todas"),
          fetch("/api/interacciones"),
        ]);
        const [semana, todas, inter] = await Promise.all([rSemana.json(), rTodas.json(), rInter.json()]);
        setPromosSemana(semana.promos ?? []);
        setPromosTodas(todas.promos ?? []);
        setGuardadas(new Set(inter.guardadas ?? []));
        setDescartadas(new Set(inter.descartadas ?? []));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // "hoy" depende de la fecha simulada, se repide cada vez que cambia.
  useEffect(() => {
    (async () => {
      const fecha = fechaParaDia(simDay);
      const r = await fetch(`/api/promos/today?fecha=${fecha}`);
      const data = await r.json();
      setPromosHoy(data.promos ?? []);
    })();
  }, [simDay]);

  const misEntidades = useMemo(
    () => new Set(catalogos.entidades.filter((e) => perfil.entidad_ids.includes(e.id)).map((e) => e.nombre)),
    [catalogos, perfil]
  );
  const misRubros = useMemo(
    () => new Set(catalogos.rubros.filter((r) => perfil.rubro_ids.includes(r.id)).map((r) => r.slug)),
    [catalogos, perfil]
  );

  const handleSave = async (id) => {
    const estabaGuardada = guardadas.has(id);
    const next = new Set(guardadas);
    estabaGuardada ? next.delete(id) : next.add(id);
    setGuardadas(next);
    try {
      if (estabaGuardada) {
        await fetch(`/api/interacciones?promo_id=${id}`, { method: "DELETE" });
      } else {
        await fetch("/api/interacciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promo_id: id, estado: "guardada" }),
        });
      }
    } catch {
      setGuardadas(guardadas);
    }
  };

  const handleDismiss = async (id) => {
    const next = new Set(descartadas);
    next.add(id);
    setDescartadas(next);
    try {
      await fetch("/api/interacciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promo_id: id, estado: "descartada" }),
      });
    } catch {
      setDescartadas(descartadas);
    }
  };

  const listaSinDescartadas = (arr) => arr.filter((p) => !descartadas.has(p.id));

  const hoyVisible = useMemo(() => listaSinDescartadas(promosHoy), [promosHoy, descartadas]);
  const semanaVisible = useMemo(() => listaSinDescartadas(promosSemana), [promosSemana, descartadas]);
  const todasVisible = useMemo(() => listaSinDescartadas(promosTodas), [promosTodas, descartadas]);

  // Si elegiste un rubro puntual, se muestra igual aunque no sea de "tus
  // rubros" — la preferencia de rubro solo decide el default (sin filtro
  // puntual) de Hoy/Tus rubros; en Todas nunca restringe, ni con "todos".
  const porRubro = (arr, usarInteres) => {
    if (rubroFiltro !== "todos") return arr.filter((p) => p.rubro === rubroFiltro);
    return usarInteres ? arr.filter((p) => misRubros.has(p.rubro)) : arr;
  };

  const list = porRubro(
    tab === "hoy" ? hoyVisible : tab === "semana" ? semanaVisible : todasVisible,
    tab !== "todas"
  );
  const hoyInteres = useMemo(() => hoyVisible.filter((p) => misRubros.has(p.rubro)), [hoyVisible, misRubros]);
  const hoyConDescuento = porRubro(hoyVisible, true).filter((p) => p.descuento_pct != null);
  const bestToday = hoyConDescuento.length > 0
    ? [...hoyConDescuento].sort((a, b) => b.descuento_pct - a.descuento_pct)[0]
    : null;
  const savedList = todasVisible.filter((p) => guardadas.has(p.id));

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px 60px" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <div className="mp-display" style={{ fontSize: 15, color: "var(--sage)", fontWeight: 500 }}>MisPromos</div>
          <div className="mp-display" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1, marginTop: 2 }}>
            Hoy es {DIAS[simDay]}
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 4 }}>
            {loading ? "Cargando tus promos..." : hoyInteres.length === 0 ? "Nada activo hoy en tus rubros." : `${hoyInteres.length} beneficio${hoyInteres.length > 1 ? "s" : ""} disponible${hoyInteres.length > 1 ? "s" : ""} para vos.`}
          </div>
        </div>
        <button onClick={onOpenSettings} className="mp-btn-ghost mp-btn" style={{ padding: 10, borderRadius: 10 }}>
          <Settings size={17} />
        </button>
      </div>

      {/* simulador de día — herramienta de demo */}
      <div className="mp-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 22, borderStyle: "dashed" }}>
        <Calendar size={15} color="var(--ink-soft)" />
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Simular otro día:</span>
        <select value={simDay} onChange={(e) => setSimDay(Number(e.target.value))}
          style={{ fontSize: 12.5, border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px", background: "var(--paper)", color: "var(--ink)", fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </div>

      {/* destacado del día */}
      {bestToday && tab === "hoy" && (
        <div style={{
          background: "var(--ink)", color: "var(--card)", borderRadius: 16,
          padding: "20px 22px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: "var(--amber)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}><TrendingDown size={22} color="var(--ink)" /></div>
          <div>
            <div style={{ fontSize: 12.5, color: "#B9C4C1" }}>El mejor de hoy</div>
            <div className="mp-display" style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>
              {bestToday.descuento_pct}% en {bestToday.comercio}
            </div>
            <div style={{ fontSize: 12.5, color: "#B9C4C1", marginTop: 2 }}>
              {bestToday.entidad}{bestToday.tope_reintegro ? ` · tope $${Number(bestToday.tope_reintegro).toLocaleString("es-AR")}` : ""}
            </div>
          </div>
        </div>
      )}

      {/* tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["hoy", "Hoy"], ["semana", "Tus rubros"], ["todas", "Todas"]].map(([key, label]) => (
          <div key={key} className={`mp-chip ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {label}
          </div>
        ))}
      </div>

      {/* filtro por rubro */}
      <div className="mp-scroll" style={{ display: "flex", gap: 8, marginBottom: 18, overflowX: "auto", paddingBottom: 2 }}>
        <div className={`mp-chip ${rubroFiltro === "todos" ? "active" : ""}`} style={{ flexShrink: 0 }} onClick={() => setRubroFiltro("todos")}>
          Todos los rubros
        </div>
        {catalogos.rubros.map((r) => {
          const Icon = RUBRO_ICONS[r.slug] ?? ShoppingCart;
          return (
            <div key={r.slug} className={`mp-chip ${rubroFiltro === r.slug ? "active" : ""}`} style={{ flexShrink: 0 }} onClick={() => setRubroFiltro(r.slug)}>
              <Icon size={13} />{r.nombre}
            </div>
          );
        })}
      </div>

      {/* lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {!loading && list.length === 0 && (
          <div className="mp-card" style={{ padding: 24, textAlign: "center", color: "var(--ink-soft)", fontSize: 14 }}>
            No hay nada para mostrar acá todavía. Probá otra pestaña, otro rubro, o ajustá tus rubros en configuración.
          </div>
        )}
        {list.map((p) => (
          <PromoCard
            key={p.id}
            promo={p}
            isToday={tab === "hoy" || hoyVisible.some((h) => h.id === p.id)}
            saved={guardadas.has(p.id)}
            activeEntidad={p.entidad ? misEntidades.has(p.entidad) : true}
            rubrosCatalogo={catalogos.rubros}
            onSave={handleSave}
            onDismiss={handleDismiss}
          />
        ))}
      </div>

      {/* guardados */}
      {savedList.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Heart size={13} fill="var(--sage)" color="var(--sage)" /> Guardados
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {savedList.map((p) => (
              <PromoCard key={p.id} promo={p} isToday={hoyVisible.some((h) => h.id === p.id)} saved
                activeEntidad={p.entidad ? misEntidades.has(p.entidad) : true} rubrosCatalogo={catalogos.rubros}
                onSave={handleSave} onDismiss={handleDismiss} />
            ))}
          </div>
        </div>
      )}

      <button onClick={onLogout} className="mp-btn mp-btn-ghost" style={{ marginTop: 40, fontSize: 12.5, opacity: 0.7, display: "flex", alignItems: "center", gap: 6 }}>
        <LogOut size={13} /> Cerrar sesión
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------
function SettingsPanel({ perfil, catalogos, onSave, onClose }) {
  const [entidadIds, setEntidadIds] = useState(perfil.entidad_ids);
  const [rubroIds, setRubroIds] = useState(perfil.rubro_ids);
  const [canal, setCanal] = useState({ email: perfil.profile.notif_email, push: perfil.profile.notif_push });
  const [frecuencia, setFrecuencia] = useState(perfil.profile.notif_frecuencia ?? "diaria");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    await onSave({
      entidad_ids: entidadIds,
      rubro_ids: rubroIds,
      notif_email: canal.email,
      notif_push: canal.push,
      notif_frecuencia: frecuencia,
    });
    setGuardando(false);
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div className="mp-display" style={{ fontSize: 24, fontWeight: 600 }}>Configuración</div>
        <button onClick={onClose} className="mp-btn-ghost mp-btn" style={{ padding: 9, borderRadius: 9 }}><X size={17} /></button>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>Tus bancos y billeteras</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
        {catalogos.entidades.map((e) => (
          <div key={e.id} className={`mp-chip ${entidadIds.includes(e.id) ? "active" : ""}`} onClick={() => toggle(entidadIds, setEntidadIds, e.id)}>
            {entidadIds.includes(e.id) && <Check size={13} />}{e.nombre}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>Rubros de interés</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
        {catalogos.rubros.map((r) => {
          const Icon = RUBRO_ICONS[r.slug] ?? ShoppingCart;
          const active = rubroIds.includes(r.id);
          return (
            <div key={r.id} className={`mp-chip ${active ? "active" : ""}`} onClick={() => toggle(rubroIds, setRubroIds, r.id)}>
              <Icon size={13} />{r.nombre}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>Canales de aviso</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 26 }}>
        {[["email", "Email", Mail], ["push", "Push", Bell]].map(([key, label, Icon]) => (
          <div key={key} className={`mp-chip ${canal[key] ? "active" : ""}`} onClick={() => setCanal({ ...canal, [key]: !canal[key] })}>
            <Icon size={13} />{label}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>Frecuencia</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {[["diaria", "El mismo día"], ["semanal", "Resumen semanal"]].map(([key, label]) => (
          <div key={key} className={`mp-chip ${frecuencia === key ? "active" : ""}`} onClick={() => setFrecuencia(key)}>{label}</div>
        ))}
      </div>

      <button className="mp-btn mp-btn-primary" style={{ width: "100%" }} disabled={guardando} onClick={guardar}>
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App raíz
// ---------------------------------------------------------------------------
export default function MisPromosApp() {
  const [catalogos, setCatalogos] = useState(null);
  const [session, setSession] = useState(undefined); // undefined = verificando, null = sin sesión
  const [perfil, setPerfil] = useState(null);
  const [view, setView] = useState("feed");

  useEffect(() => {
    fetch("/api/catalogos").then((r) => r.json()).then(setCatalogos);
  }, []);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setSession(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const cargarPerfil = useCallback(async () => {
    const r = await fetch("/api/perfil");
    if (r.ok) setPerfil(await r.json());
  }, []);

  useEffect(() => {
    if (session) cargarPerfil();
    else setPerfil(null);
  }, [session, cargarPerfil]);

  const handleLogout = async () => {
    await supabaseBrowser().auth.signOut();
    setView("feed");
  };

  if (!catalogos || session === undefined) {
    return <div className="mp-root"><Styles /></div>;
  }

  return (
    <div className="mp-root">
      <Styles />
      {!session ? (
        <Login />
      ) : !perfil ? (
        <div />
      ) : !perfil.profile.onboarding_completo ? (
        <Onboarding
          catalogos={catalogos}
          onFinish={async (payload) => {
            await fetch("/api/perfil", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, onboarding_completo: true }),
            });
            await cargarPerfil();
          }}
        />
      ) : view === "settings" ? (
        <SettingsPanel
          perfil={perfil}
          catalogos={catalogos}
          onClose={() => setView("feed")}
          onSave={async (payload) => {
            await fetch("/api/perfil", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            await cargarPerfil();
            setView("feed");
          }}
        />
      ) : (
        <Feed perfil={perfil} catalogos={catalogos} onOpenSettings={() => setView("settings")} onLogout={handleLogout} />
      )}
    </div>
  );
}
