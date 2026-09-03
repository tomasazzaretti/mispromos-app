// app/admin/promos/page.tsx
// Panel de administración de promos: tabla con todo el catálogo (activo e
// inactivo) + formulario de alta/edición. Reemplaza los inserts a mano en
// seed.sql para la carga semanal de promos nuevas.
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const styles = `
  .adm-root {
    --ink: #16302E; --ink-soft: #4A5F5C; --amber: #D9A441; --amber-deep: #B5822A;
    --sage: #4C7A72; --rust: #B54A34; --paper: #EEF0E9; --card: #FBFBF8; --line: #DADFD5;
    font-family: 'IBM Plex Sans', sans-serif; background: var(--paper); color: var(--ink);
    min-height: 100vh; width: 100%; box-sizing: border-box;
  }
  .adm-root * { box-sizing: border-box; }
  .adm-display { font-family: 'Fraunces', serif; }
  .adm-card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; }
  .adm-label { font-size: 12.5px; font-weight: 600; color: var(--ink-soft); margin-bottom: 6px; display: block; }
  .adm-input, .adm-select {
    width: 100%; padding: 10px 12px; border-radius: 9px; border: 1.5px solid var(--line);
    font-size: 13.5px; font-family: 'IBM Plex Sans', sans-serif; background: var(--paper); color: var(--ink);
  }
  .adm-input:focus, .adm-select:focus { outline: none; border-color: var(--sage); }
  .adm-btn {
    font-family: 'IBM Plex Sans', sans-serif; font-weight: 600; font-size: 13.5px;
    border-radius: 9px; border: none; cursor: pointer; padding: 10px 18px; transition: opacity .15s;
  }
  .adm-btn:disabled { opacity: .5; cursor: not-allowed; }
  .adm-btn-primary { background: var(--ink); color: var(--card); }
  .adm-btn-primary:hover { opacity: .9; }
  .adm-btn-ghost { background: transparent; color: var(--ink-soft); border: 1.5px solid var(--line); }
  .adm-btn-ghost:hover { border-color: var(--ink-soft); color: var(--ink); }
  .adm-day {
    width: 34px; height: 34px; border-radius: 8px; border: 1.5px solid var(--line);
    display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;
    cursor: pointer; background: var(--paper); color: var(--ink-soft); user-select: none;
  }
  .adm-day.active { background: var(--ink); border-color: var(--ink); color: var(--card); }
  table.adm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.adm-table th {
    text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .03em;
    color: var(--ink-soft); padding: 8px 10px; border-bottom: 1.5px solid var(--line);
  }
  table.adm-table td { padding: 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .adm-chip {
    display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
    font-size: 11.5px; font-weight: 600;
  }
  .adm-chip.on { background: rgba(76,122,114,.15); color: var(--sage); }
  .adm-chip.off { background: rgba(181,74,52,.12); color: var(--rust); }
`;

type Entidad = { id: string; nombre: string; tipo: string };
type Rubro = { id: string; slug: string; nombre: string };
type Promo = {
  id: string;
  comercio: string;
  descuento_pct: number | null;
  cuotas_sin_interes: number | null;
  tope_reintegro: number | null;
  dias_semana: number[];
  medio_pago: string | null;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  fuente_url: string | null;
  fiabilidad_pct: number;
  activo: boolean;
  origen: string;
  entidad_id: string | null;
  rubro_id: string;
  entidades: { nombre: string } | null;
  rubros: { nombre: string; slug: string } | null;
};

const FORM_VACIO = {
  entidad_id: "",
  rubro_id: "",
  comercio: "",
  descuento_pct: "",
  cuotas_sin_interes: "",
  tope_reintegro: "",
  dias_semana: [] as number[],
  medio_pago: "",
  vigencia_desde: "",
  vigencia_hasta: "",
  fuente_url: "",
  fiabilidad_pct: "100",
  activo: true,
};

export default function AdminPromosPage() {
  const router = useRouter();
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [filtro, setFiltro] = useState<"todas" | "activas" | "inactivas">("todas");
  const [rubroFiltro, setRubroFiltro] = useState("todos");

  const cargarTodo = async () => {
    setLoading(true);
    setError("");
    try {
      const [rCat, rPromos] = await Promise.all([
        fetch("/api/admin/catalogos"),
        fetch("/api/admin/promos"),
      ]);
      if (!rCat.ok || !rPromos.ok) throw new Error("No se pudo cargar el panel");
      const cat = await rCat.json();
      const p = await rPromos.json();
      setEntidades(cat.entidades ?? []);
      setRubros(cat.rubros ?? []);
      setPromos(p.promos ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const toggleDia = (d: number) => {
    setForm((f) => ({
      ...f,
      dias_semana: f.dias_semana.includes(d)
        ? f.dias_semana.filter((x) => x !== d)
        : [...f.dias_semana, d].sort(),
    }));
  };

  const resetForm = () => {
    setForm(FORM_VACIO);
    setEditingId(null);
  };

  const handleEdit = (p: Promo) => {
    setEditingId(p.id);
    setForm({
      entidad_id: p.entidad_id ?? "",
      rubro_id: p.rubro_id,
      comercio: p.comercio,
      descuento_pct: p.descuento_pct != null ? String(p.descuento_pct) : "",
      cuotas_sin_interes: p.cuotas_sin_interes != null ? String(p.cuotas_sin_interes) : "",
      tope_reintegro: p.tope_reintegro != null ? String(p.tope_reintegro) : "",
      dias_semana: p.dias_semana,
      medio_pago: p.medio_pago ?? "",
      vigencia_desde: p.vigencia_desde?.slice(0, 10) ?? "",
      vigencia_hasta: p.vigencia_hasta?.slice(0, 10) ?? "",
      fuente_url: p.fuente_url ?? "",
      fiabilidad_pct: String(p.fiabilidad_pct),
      activo: p.activo,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.descuento_pct && !form.cuotas_sin_interes) {
      setError("Cargá al menos un % de descuento o una cantidad de cuotas sin interés");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      entidad_id: form.entidad_id || null,
      rubro_id: form.rubro_id,
      comercio: form.comercio,
      descuento_pct: form.descuento_pct ? Number(form.descuento_pct) : null,
      cuotas_sin_interes: form.cuotas_sin_interes ? Number(form.cuotas_sin_interes) : null,
      tope_reintegro: form.tope_reintegro ? Number(form.tope_reintegro) : null,
      dias_semana: form.dias_semana,
      medio_pago: form.medio_pago || null,
      vigencia_desde: form.vigencia_desde || undefined,
      vigencia_hasta: form.vigencia_hasta || null,
      fuente_url: form.fuente_url || null,
      fiabilidad_pct: form.fiabilidad_pct === "" ? 100 : Number(form.fiabilidad_pct),
      activo: form.activo,
    };

    try {
      const res = await fetch(
        editingId ? `/api/admin/promos/${editingId}` : "/api/admin/promos",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");

      resetForm();
      await cargarTodo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Borrar esta promo definitivamente?")) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/promos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo borrar");
      if (editingId === id) resetForm();
      await cargarTodo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
  };

  const handleToggleActivo = async (p: Promo) => {
    setError("");
    try {
      const res = await fetch(`/api/admin/promos/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !p.activo }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar");
      await cargarTodo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const promosFiltradas = useMemo(() => {
    let resultado = promos;
    if (filtro === "activas") resultado = resultado.filter((p) => p.activo);
    if (filtro === "inactivas") resultado = resultado.filter((p) => !p.activo);
    if (rubroFiltro !== "todos") resultado = resultado.filter((p) => p.rubro_id === rubroFiltro);
    return resultado;
  }, [promos, filtro, rubroFiltro]);

  return (
    <div className="adm-root">
      <style>{styles}</style>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div className="adm-display" style={{ fontSize: 15, color: "var(--sage)", fontWeight: 500 }}>
              MisPromos — Admin
            </div>
            <div className="adm-display" style={{ fontSize: 28, fontWeight: 600, marginTop: 2 }}>
              Catálogo de promos
            </div>
          </div>
          <button onClick={handleLogout} className="adm-btn adm-btn-ghost">Cerrar sesión</button>
        </div>

        {error && (
          <div className="adm-card" style={{ padding: "12px 16px", marginBottom: 20, borderColor: "var(--rust)", color: "var(--rust)", fontSize: 13.5 }}>
            {error}
          </div>
        )}

        {/* formulario de alta / edición */}
        <form onSubmit={handleSubmit} className="adm-card" style={{ padding: 22, marginBottom: 32 }}>
          <div className="adm-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>
            {editingId ? "Editar promo" : "Cargar promo nueva"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label className="adm-label">Entidad</label>
              <select className="adm-select" value={form.entidad_id}
                onChange={(e) => setForm({ ...form, entidad_id: e.target.value })}>
                <option value="">Ninguna (promo directa de la tienda)</option>
                {entidades.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre} ({e.tipo})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="adm-label">Rubro</label>
              <select className="adm-select" value={form.rubro_id}
                onChange={(e) => setForm({ ...form, rubro_id: e.target.value })} required>
                <option value="">Elegir...</option>
                {rubros.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="adm-label">Comercio(s)</label>
            <input className="adm-input" placeholder="YPF, Axion, Shell"
              value={form.comercio} onChange={(e) => setForm({ ...form, comercio: e.target.value })} required />
          </div>

          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>
            Cargá al menos uno de los dos: % de descuento y/o cuotas sin interés (pueden ir juntos).
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label className="adm-label">Descuento %</label>
              <input className="adm-input" type="number" min="1" max="100" step="1" placeholder="sin descuento"
                value={form.descuento_pct} onChange={(e) => setForm({ ...form, descuento_pct: e.target.value })} />
            </div>
            <div>
              <label className="adm-label">Cuotas sin interés</label>
              <input className="adm-input" type="number" min="1" step="1" placeholder="sin cuotas"
                value={form.cuotas_sin_interes} onChange={(e) => setForm({ ...form, cuotas_sin_interes: e.target.value })} />
            </div>
            <div>
              <label className="adm-label">Tope reintegro ($)</label>
              <input className="adm-input" type="number" min="0" step="1" placeholder="sin tope"
                value={form.tope_reintegro} onChange={(e) => setForm({ ...form, tope_reintegro: e.target.value })} />
            </div>
            <div>
              <label className="adm-label">Medio de pago</label>
              <input className="adm-input" placeholder="QR MODO BNA+"
                value={form.medio_pago} onChange={(e) => setForm({ ...form, medio_pago: e.target.value })} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="adm-label">Días de vigencia</label>
            <div style={{ display: "flex", gap: 6 }}>
              {DIAS.map((d, i) => (
                <div key={i} className={`adm-day ${form.dias_semana.includes(i) ? "active" : ""}`} onClick={() => toggleDia(i)}>
                  {d}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label className="adm-label">Vigente desde</label>
              <input className="adm-input" type="date"
                value={form.vigencia_desde} onChange={(e) => setForm({ ...form, vigencia_desde: e.target.value })} />
            </div>
            <div>
              <label className="adm-label">Vigente hasta (opcional)</label>
              <input className="adm-input" type="date"
                value={form.vigencia_hasta} onChange={(e) => setForm({ ...form, vigencia_hasta: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label className="adm-label">Fuente (URL)</label>
              <input className="adm-input" type="url" placeholder="https://www.bna.com.ar/beneficios"
                value={form.fuente_url} onChange={(e) => setForm({ ...form, fuente_url: e.target.value })} />
            </div>
            <div>
              <label className="adm-label">Fiabilidad de datos (%)</label>
              <input className="adm-input" type="number" min="0" max="100" step="5"
                value={form.fiabilidad_pct} onChange={(e) => setForm({ ...form, fiabilidad_pct: e.target.value })} />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, marginBottom: 20, cursor: "pointer" }}>
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            Activa (visible para los usuarios)
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="adm-btn adm-btn-primary"
              disabled={saving || form.dias_semana.length === 0 || (!form.descuento_pct && !form.cuotas_sin_interes)}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Cargar promo"}
            </button>
            {editingId && (
              <button type="button" className="adm-btn adm-btn-ghost" onClick={resetForm}>Cancelar edición</button>
            )}
          </div>
        </form>

        {/* filtros + tabla */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {(["todas", "activas", "inactivas"] as const).map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`adm-btn ${filtro === f ? "adm-btn-primary" : "adm-btn-ghost"}`} style={{ padding: "8px 14px" }}>
              {f === "todas" ? "Todas" : f === "activas" ? "Activas" : "Inactivas"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={() => setRubroFiltro("todos")}
            className={`adm-btn ${rubroFiltro === "todos" ? "adm-btn-primary" : "adm-btn-ghost"}`} style={{ padding: "8px 14px" }}>
            Todos los rubros
          </button>
          {rubros.map((r) => (
            <button key={r.id} onClick={() => setRubroFiltro(r.id)}
              className={`adm-btn ${rubroFiltro === r.id ? "adm-btn-primary" : "adm-btn-ghost"}`} style={{ padding: "8px 14px" }}>
              {r.nombre}
            </button>
          ))}
        </div>

        <div className="adm-card" style={{ padding: 4, overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5 }}>Cargando...</div>
          ) : promosFiltradas.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5 }}>No hay promos para mostrar.</div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Entidad</th>
                  <th>Rubro</th>
                  <th>Comercio</th>
                  <th>%</th>
                  <th>Cuotas</th>
                  <th>Días</th>
                  <th>Vigencia</th>
                  <th>Fiabilidad</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {promosFiltradas.map((p) => (
                  <tr key={p.id}>
                    <td>{p.entidades?.nombre ?? <span style={{ color: "var(--ink-soft)" }}>— (sin banco)</span>}</td>
                    <td>{p.rubros?.nombre}</td>
                    <td>{p.comercio}</td>
                    <td>{p.descuento_pct != null ? `${p.descuento_pct}%` : "—"}</td>
                    <td>{p.cuotas_sin_interes != null ? `${p.cuotas_sin_interes}x` : "—"}</td>
                    <td>{p.dias_semana.map((d) => DIAS[d]).join(", ")}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      {p.vigencia_desde?.slice(0, 10)}{p.vigencia_hasta ? ` → ${p.vigencia_hasta.slice(0, 10)}` : ""}
                    </td>
                    <td>
                      <span className={`adm-chip ${p.fiabilidad_pct >= 80 ? "on" : p.fiabilidad_pct >= 50 ? "" : "off"}`}
                        style={p.fiabilidad_pct >= 80 || p.fiabilidad_pct < 50 ? {} : { background: "rgba(217,164,65,.18)", color: "var(--amber-deep)" }}>
                        {p.fiabilidad_pct}%
                      </span>
                    </td>
                    <td>
                      <span className={`adm-chip ${p.activo ? "on" : "off"}`} style={{ cursor: "pointer" }}
                        onClick={() => handleToggleActivo(p)}>
                        {p.activo ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="adm-btn adm-btn-ghost" style={{ padding: "6px 10px" }} onClick={() => handleEdit(p)}>Editar</button>
                        <button className="adm-btn adm-btn-ghost" style={{ padding: "6px 10px", color: "var(--rust)" }} onClick={() => handleDelete(p.id)}>Borrar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
