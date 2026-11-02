import { Home } from "@/components/Home";
import { requireUser } from "@/lib/supabase/server";

export default async function Page() {
  await requireUser();
  return <Home />;
}
