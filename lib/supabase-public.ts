// lib/supabase-public.ts
// Cliente con la anon key, sin sesión de usuario. Para datos que cualquiera
// puede leer según las policies de RLS (entidades, rubros) — no requiere
// que el usuario esté logueado, así que la pantalla de onboarding puede
// mostrar el catálogo antes de que exista sesión.

import { createClient } from "@supabase/supabase-js";

export function supabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
