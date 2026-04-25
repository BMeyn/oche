import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — OCHE" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <LoginForm error={error} />;
}
