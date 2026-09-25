import LoginForm from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirected?: string }>;
}) {
  return <LoginForm searchParams={searchParams} />;
}
