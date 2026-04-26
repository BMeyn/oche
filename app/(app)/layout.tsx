import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { FeedbackButton } from "@/components/ui/FeedbackButton";

// Force dynamic rendering — this layout reads cookies(), so it must never be
// statically pre-rendered at build time (which would cache the redirect-to-login
// response and serve it to all users regardless of their session cookie).
export const dynamic = "force-dynamic";

// Validates session against the DB — the real security boundary.
// Middleware does a fast cookie-presence check; this confirms the session is live.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <>
      {children}
      <FeedbackButton />
    </>
  );
}
