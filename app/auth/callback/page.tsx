"use client";

// app/auth/callback/page.tsx
// A donde redirige Supabase después de que el usuario clickea el magic link
// del mail. A propósito NO intercambia el código en el load de la página
// (un GET): así, si el cliente de mail o alguna app precarga/previsualiza el
// link automáticamente, no gasta el código de un solo uso. El intercambio
// real pasa recién cuando la persona clickea "Confirmar acceso", vía POST a
// /api/auth/exchange.

import { useEffect, useState } from "react";

const COLORS = {
  ink: "#16302E",
  inkSoft: "#4A5F5C",
  sage: "#4C7A72",
  rust: "#B54A34",
  paper: "#EEF0E9",
  card: "#FBFBF8",
  line: "#DADFD5",
};

export default function AuthCallbackPage() {
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "nocode">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (!c) {
      setStatus("nocode");
      return;
    }
    setCode(c);
  }, []);

  const handleConfirm = async () => {
    if (!code) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "No pudimos confirmar el acceso.");
        return;
      }

      window.location.href = "/";
    } catch {
      setStatus("error");
      setErrorMsg("No pudimos confirmar el acceso.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: COLORS.paper,
        color: COLORS.ink,
        fontFamily: "'IBM Plex Sans', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: 380, width: "100%", padding: "0 20px", textAlign: "center" }}>
        <div style={{ fontSize: 15, color: COLORS.sage, fontWeight: 500, marginBottom: 4 }}>MisPromos</div>

        {status === "nocode" && (
          <>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Link inválido</div>
            <div style={{ fontSize: 14, color: COLORS.inkSoft }}>
              Este link no tiene un código de acceso. Volvé a la app y pedí uno nuevo.
            </div>
          </>
        )}

        {(status === "idle" || status === "loading") && code && (
          <>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Confirmá tu acceso</div>
            <div style={{ fontSize: 14, color: COLORS.inkSoft, marginBottom: 24 }}>
              Tocá el botón para terminar de entrar a MisPromos.
            </div>
            <button
              onClick={handleConfirm}
              disabled={status === "loading"}
              style={{
                width: "100%",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 10,
                border: "none",
                cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.5 : 1,
                padding: "12px 22px",
                background: COLORS.ink,
                color: COLORS.card,
              }}
            >
              {status === "loading" ? "Confirmando..." : "Confirmar acceso"}
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: COLORS.rust }}>
              Este link ya no es válido
            </div>
            <div style={{ fontSize: 14, color: COLORS.inkSoft, marginBottom: 16 }}>
              Puede haber expirado o ya haberse usado. Volvé a la app y pedí un link nuevo.
            </div>
            <div style={{ fontSize: 12, color: COLORS.inkSoft, opacity: 0.7 }}>{errorMsg}</div>
          </>
        )}
      </div>
    </div>
  );
}
