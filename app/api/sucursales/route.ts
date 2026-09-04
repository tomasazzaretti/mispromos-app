// app/api/sucursales/route.ts
// Catálogo público de sucursales físicas, para "cerca tuyo". No requiere
// login: "cualquiera puede ver sucursales" está permitido por RLS.
//
// Con miles de filas (todo el padrón de estaciones de servicio + súper),
// no tiene sentido mandarle el catálogo entero al cliente para que calcule
// distancia ahí — con ?lat=&lng= se filtra primero por una caja de ~1° (unos
// 110km, de sobra para encontrar las N más cercanas) y se ordena por
// distancia real (haversine) acá, devolviendo solo las `limit` más cercanas.
// Sin lat/lng devuelve el catálogo entero (lo sigue usando el admin/debug).

import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase-public";
import { haversineKm } from "@/lib/geo";

export async function GET(request: Request) {
  const supabase = supabasePublic();
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const limit = Math.min(Number(searchParams.get("limit") ?? 15) || 15, 50);
  const tieneUbicacion = Number.isFinite(lat) && Number.isFinite(lng);

  let query = supabase.from("sucursales").select("id, comercio, nombre, direccion, lat, lng, rubros ( slug )");

  if (tieneUbicacion) {
    // ~35km de radio — de sobra para encontrar 15 cercanas incluso en
    // ciudades densas, y chico para no pisar el máximo de 1000 filas por
    // respuesta de PostgREST antes de ordenar por distancia real.
    const caja = 0.32;
    query = query
      .gte("lat", lat - caja).lte("lat", lat + caja)
      .gte("lng", lng - caja).lte("lng", lng + caja)
      .limit(800);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sucursales = (data ?? []).map((s: any) => ({
    id: s.id,
    comercio: s.comercio,
    nombre: s.nombre,
    direccion: s.direccion,
    lat: Number(s.lat),
    lng: Number(s.lng),
    rubro: s.rubros?.slug,
  }));

  if (tieneUbicacion) {
    sucursales = sucursales
      .map((s) => ({ ...s, distanciaKm: haversineKm(lat, lng, s.lat, s.lng) }))
      .sort((a, b) => a.distanciaKm - b.distanciaKm)
      .slice(0, limit);
  }

  return NextResponse.json({ sucursales });
}
