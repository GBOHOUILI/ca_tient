import { redirect } from "next/navigation";

// The Phase 6b-2b stats page now lives in the dashboard.
export default function AdminStatsRedirect() {
  redirect("/admin/conversion");
}
