// lib/supabase-browser.ts
// Cliente de Supabase para usar en componentes cliente ("use client"). Solo
// para auth (magic link, signOut, leer sesión) — los datos de la app se leen
// siempre a través de las rutas /api/*, no directo desde el browser.

import { createBrowserClient } from "@supabase/ssr";

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
