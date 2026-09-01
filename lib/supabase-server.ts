// lib/supabase-server.ts
// Cliente de Supabase para usar dentro de Route Handlers (app/api/*): lee y
// escribe la cookie de sesión con @supabase/ssr, que es lo que reemplaza a
// @supabase/auth-helpers-nextjs (deprecado). Solo se usa en Route Handlers,
// nunca en Server Components, así que escribir cookies siempre es seguro acá.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
