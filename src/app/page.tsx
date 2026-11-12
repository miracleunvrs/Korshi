import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    redirect("/feed");
  }

  // redirect() works by throwing, so it must stay outside the try/catch.
  let target = "/login";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) target = "/feed";
  } catch {
    target = "/login";
  }
  redirect(target);
}
