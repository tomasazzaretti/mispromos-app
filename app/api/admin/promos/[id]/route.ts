// app/api/admin/promos/[id]/route.ts
// PATCH -> edita cualquier subconjunto de campos de una promo (incluye
// activar/desactivar). DELETE -> la borra definitivamente.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const CAMPOS_EDITABLES = [
  "entidad_id", "rubro_id", "comercio", "descuento_pct", "tope_reintegro",
  "dias_semana", "medio_pago", "vigencia_desde", "vigencia_hasta",
  "fuente_url", "activo",
];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) update[campo] = body[campo] === "" ? null : body[campo];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("promos")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ promo: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("promos").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
