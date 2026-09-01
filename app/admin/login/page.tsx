// app/admin/login/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const styles = `
  .adm-root {
    --ink: #16302E; --ink-soft: #4A5F5C; --amber: #D9A441; --amber-deep: #B5822A;
    --sage: #4C7A72; --rust: #B54A34; --paper: #EEF0E9; --card: #FBFBF8; --line: #DADFD5;
    font-family: 'IBM Plex Sans', sans-serif; background: var(--paper); color: var(--ink);
    min-height: 100vh; width: 100%; box-sizing: border-box;
    display: flex; align-items: center; justify-content: center;
  }
  .adm-root * { box-sizing: border-box; }
  .adm-display { font-family: 'Fraunces', serif; }
  .adm-card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; }
  .adm-input {
    width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line);
    font-size: 14px; font-family: 'IBM Plex Sans', sans-serif; background: var(--paper); color: var(--ink);
  }
  .adm-input:focus { outline: none; border-color: var(--sage); }
  .adm-btn {
    font-family: 'IBM Plex Sans', sans-serif; font-weight: 600; font-size: 14px;
    border-radius: 10px; border: none; cursor: pointer; padding: 12px 22px;
    background: var(--ink); color: var(--card); transition: opacity .15s;
  }
  .adm-btn:hover { opacity: .9; }
  .adm-btn:disabled { opacity: .5; cursor: not-allowed; }
`;

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Contraseña incorrecta.");
      return;
    }

    router.push("/admin/promos");
    router.refresh();
  };

  return (
    <div className="adm-root">
      <style>{styles}</style>
      <form onSubmit={handleSubmit} className="adm-card" style={{ padding: 32, width: 340 }}>
        <div className="adm-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
          MisPromos — Admin
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 20 }}>
          Ingresá la contraseña para cargar y editar promos.
        </div>
        <input
          type="password"
          autoFocus
          className="adm-input"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {error && (
          <div style={{ fontSize: 12.5, color: "var(--rust)", marginBottom: 12 }}>{error}</div>
        )}
        <button type="submit" className="adm-btn" disabled={loading || !password} style={{ width: "100%" }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
