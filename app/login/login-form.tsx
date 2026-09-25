"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginFormInner({
  initialRedirected,
}: {
  initialRedirected: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirected = initialRedirected || !!searchParams.get("redirected");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Introduce usuario y contraseña.");
      return;
    }
    try {
      setCargando(true);
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        let msg = "Credenciales incorrectas.";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        setError(msg);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img
              src="/logo_accede.svg"
              alt="Logo Accede"
              className="h-10 w-auto"
            />
            <img
              src="/logo_comunidad-madrid.svg"
              alt="Logo Comunidad de Madrid"
              className="h-14 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Generador de Recibos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Acceso al panel de administración
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {redirected && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Inicia sesión para continuar.
            </div>
          )}

          <form onSubmit={enviar} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Introduce tu usuario"
                disabled={cargando}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Introduce tu contraseña"
                disabled={cargando}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {cargando ? "Iniciando sesión…" : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} — Accede · Comunidad de Madrid
        </p>
      </div>
    </div>
  );
}

export default function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ redirected?: string }>;
}) {
  let initialRedirected = false;
  try {
    const sp = (searchParams as unknown) as { redirected?: string };
    initialRedirected = !!sp?.redirected;
  } catch {}

  return (
    <Suspense fallback={null}>
      <LoginFormInner initialRedirected={initialRedirected} />
    </Suspense>
  );
}
