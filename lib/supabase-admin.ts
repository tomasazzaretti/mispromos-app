// lib/supabase-admin.ts
// Cliente de Supabase con la service role key: bypassea RLS. Se usa SOLO en
// las rutas /api/admin/*, que ya están protegidas por el middleware con la
// contraseña de administrador. Nunca importar este archivo desde código que
// corre en el browser.

import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
