"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

export type VersionInfo = {
  version: string;
  buildDate: string;
  buildCommit: string;
  appName: string;
};

interface Libro {
  id: string;
  codigo: string;
  titulo: string;
  estado: string;
}

const STORAGE_KEY = "recibos_manuales:datos_colegio";
const ESTADOS_LIBRO = ["Nuevo", "Usado", "Deteriorado"];
const ASIGNATURAS_PREDETERMINADAS = [
  "Inglés",
  "Lengua",
  "Matemáticas",
  "C. Sociales",
  "C. Naturales",
  "Religión",
  "Música",
];
const OPCION_OTRO = "Otro...";
const LONGITUD_CODIGO_ACCEDER = 15;
const REGEX_CODIGO_ACCEDER = /^\d{15}$/;

const codigoAccederValido = (codigo: string): boolean =>
  REGEX_CODIGO_ACCEDER.test(codigo);

function generarId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fechaHoy(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function HomeClient({ version }: { version: VersionInfo }) {
  const router = useRouter();
  const [nombreColegio, setNombreColegio] = useState("");
  const [codigoColegio, setCodigoColegio] = useState("");
  const [nombreAlumno, setNombreAlumno] = useState("");
  const [cursoGrupo, setCursoGrupo] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState(fechaHoy());
  const [ubicacion, setUbicacion] = useState("Biblioteca");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.nombreColegio === "string")
          setNombreColegio(parsed.nombreColegio);
        if (typeof parsed.codigoColegio === "string")
          setCodigoColegio(parsed.codigoColegio);
        if (typeof parsed.ubicacion === "string")
          setUbicacion(parsed.ubicacion);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ nombreColegio, codigoColegio, ubicacion })
      );
    } catch {}
  }, [nombreColegio, codigoColegio, ubicacion]);

  const prefijoColegio = useMemo(
    () =>
      (codigoColegio || "")
        .replace(/\D/g, "")
        .slice(0, LONGITUD_CODIGO_ACCEDER),
    [codigoColegio]
  );

  const [libros, setLibros] = useState<Libro[]>([
    { id: generarId(), codigo: prefijoColegio, titulo: "", estado: "Nuevo" },
  ]);

  const agregarLibro = () => {
    setLibros((prev) => {
      const ultimo = prev[prev.length - 1];
      if (prev.length > 0 && !codigoAccederValido(ultimo.codigo)) {
        alert(
          "Completa el Código Accede (15 dígitos numéricos) del ejemplar actual antes de añadir otro."
        );
        return prev;
      }
      return [
        ...prev,
        {
          id: generarId(),
          codigo: prefijoColegio,
          titulo: "",
          estado: "Nuevo",
        },
      ];
    });
  };

  const quitarLibro = (id: string) => {
    setLibros((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  };

  const actualizarLibro = (
    id: string,
    campo: keyof Libro,
    valor: string
  ) => {
    if (campo === "codigo") {
      const soloDigitos = valor
        .replace(/\D/g, "")
        .slice(0, LONGITUD_CODIGO_ACCEDER);
      setLibros((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [campo]: soloDigitos } : l))
      );
    } else {
      setLibros((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l))
      );
    }
  };

  const limpiarFormulario = () => {
    setNombreAlumno("");
    setCursoGrupo("");
    setFechaEntrega(fechaHoy());
    setUbicacion("Biblioteca");
    setLibros([
      {
        id: generarId(),
        codigo: prefijoColegio,
        titulo: "",
        estado: "Nuevo",
      },
    ]);
  };

  const [saliendo, setSaliendo] = useState(false);
  const cerrarSesion = async () => {
    try {
      setSaliendo(true);
      await fetch("/api/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setSaliendo(false);
    }
  };

  useEffect(() => {
    setLibros((prev) =>
      prev.map((l) => {
        if (l.codigo === "" || l.codigo === prefijoColegio) {
          return { ...l, codigo: prefijoColegio };
        }
        if (
          prefijoColegio.length > 0 &&
          l.codigo.length < prefijoColegio.length &&
          prefijoColegio.startsWith(l.codigo)
        ) {
          return { ...l, codigo: prefijoColegio };
        }
        return l;
      })
    );
  }, [prefijoColegio]);

  const librosValidos = useMemo(
    () => libros.filter((l) => codigoAccederValido(l.codigo)),
    [libros]
  );

  const todosCodigosValidos =
    libros.length > 0 && libros.every((l) => codigoAccederValido(l.codigo));

  const bloqueos = useMemo(() => {
    const b: { campo: string; ok: boolean; detalle?: string }[] = [];
    b.push({
      campo: "Nombre del alumno",
      ok: nombreAlumno.trim().length > 0,
    });
    b.push({
      campo: "Curso / Grupo",
      ok: cursoGrupo.trim().length > 0,
    });
    b.push({
      campo: "Fecha de entrega",
      ok: fechaEntrega.trim().length > 0,
    });
    if (librosValidos.length === 0) {
      b.push({
        campo: "Ejemplares válidos",
        ok: false,
        detalle:
          "Necesitas al menos 1 ejemplar con Código Accede completo (15 dígitos numéricos). Si tu código del centro es muy largo, reduzlo o acorta el prefijo.",
      });
    } else {
      const invalidos = libros.filter(
        (l) => !codigoAccederValido(l.codigo)
      ).length;
      b.push({
        campo: `Códigos Accede completos`,
        ok: invalidos === 0,
        detalle:
          invalidos > 0
            ? `${invalidos} ejemplar(es) con código incompleto (deben ser 15 dígitos exactos)`
            : undefined,
      });
    }
    return b;
  }, [
    nombreAlumno,
    cursoGrupo,
    fechaEntrega,
    librosValidos.length,
    libros,
  ]);

  const puedeImprimir = bloqueos.every((b) => b.ok);

  const mensajeBloqueos = useMemo(() => {
    const fallos = bloqueos.filter((b) => !b.ok);
    if (fallos.length === 0) return "";
    const lineas = fallos
      .map(
        (b) =>
          `• ${b.campo}${b.detalle ? " — " + b.detalle : ""}`
      )
      .join("\n");
    return `Falta para activar los botones:\n\n${lineas}`;
  }, [bloqueos]);

  const imprimir = () => {
    if (!puedeImprimir) {
      const faltantes: string[] = [];
      if (!nombreAlumno.trim()) faltantes.push("Nombre del alumno");
      if (!cursoGrupo.trim()) faltantes.push("Curso / Grupo");
      if (!fechaEntrega.trim()) faltantes.push("Fecha de entrega");
      if (librosValidos.length === 0) {
        faltantes.push("Al menos 1 ejemplar con Código Accede válido");
      } else {
        const invalidos = libros.filter(
          (l) => !codigoAccederValido(l.codigo)
        ).length;
        if (invalidos > 0) {
          faltantes.push(
            `${invalidos} ejemplar(es) con Código Accede incompleto (${LONGITUD_CODIGO_ACCEDER} dígitos)`
          );
        }
      }
      alert(
        "Completa los siguientes campos antes de imprimir:\n\n• " +
          faltantes.join("\n• ")
      );
      return;
    }
    window.print();
  };

  const [exportandoPdf, setExportandoPdf] = useState(false);

  const generarPDF = async () => {
    if (!puedeImprimir) return;
    try {
      setExportandoPdf(true);
      const res = await fetch("/api/generar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreColegio,
          nombreAlumno,
          cursoGrupo,
          fechaEntrega,
          ubicacion,
          libros: librosValidos.map((l) => ({
            codigo: l.codigo,
            titulo: l.titulo,
            estado: l.estado,
          })),
        }),
      });
      if (!res.ok) {
        let msg = `Error ${res.status} generando el PDF.`;
        try {
          const j = await res.json();
          if (j?.error) msg += `\n${j.error}`;
        } catch {}
        alert(msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const nombre = nombreAlumno.trim() || "alumno";
      const nombreLimpio = nombre.replace(/[\\/:*?"<>|]+/g, "_");
      a.href = url;
      a.download = `Recibo de entrega de ${nombreLimpio}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      console.error(err);
      alert(
        "No se pudo generar el PDF. Usa el botón Imprimir y elige 'Guardar como PDF' en el diálogo del navegador."
      );
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <div className="min-h-screen w-full">
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Generador de Recibos
            </h1>
            <p className="text-sm text-slate-500">
              Entrega de ejemplares escolares
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={cerrarSesion}
              disabled={saliendo}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Cerrar sesión"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="hidden sm:inline">Salir</span>
            </button>
            <button
              onClick={limpiarFormulario}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={generarPDF}
              disabled={!puedeImprimir || exportandoPdf}
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow transition-colors flex items-center gap-2 ${
                puedeImprimir && !exportandoPdf
                  ? "text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                  : "text-slate-500 bg-slate-200 cursor-not-allowed opacity-70"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {exportandoPdf ? "Generando…" : "Guardar PDF"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="no-print space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Datos del centro (se guardan automáticamente)
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del colegio
                </label>
                <input
                  type="text"
                  value={nombreColegio}
                  onChange={(e) => setNombreColegio(e.target.value)}
                  placeholder="Ej: CEIP Miguel de Cervantes"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Código del centro
                </label>
                <input
                  type="text"
                  value={codigoColegio}
                  onChange={(e) => setCodigoColegio(e.target.value)}
                  placeholder="Ej: 28012345"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Datos del recibo
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del alumno <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombreAlumno}
                  onChange={(e) => setNombreAlumno(e.target.value)}
                  placeholder="Ej: Matías Vera Medrano"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Curso / Grupo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cursoGrupo}
                    onChange={(e) => setCursoGrupo(e.target.value)}
                    placeholder="Ej: 3º Primaria / P3A"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha de entrega <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    placeholder="DD-MM-AAAA"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ubicación de entrega
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej: Biblioteca"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">
                Ejemplares entregados
              </h2>
              <button
                onClick={agregarLibro}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Añadir libro
              </button>
            </div>
            <div className="space-y-3">
              {libros.map((libro, idx) => (
                <div
                  key={libro.id}
                  className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="col-span-12 sm:col-span-1 flex items-start justify-center pt-2">
                    <span className="text-xs font-semibold text-slate-500">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 mb-0.5">
                      Código Accede{" "}
                      <span className="text-slate-400">(15 dígitos)</span>
                      {prefijoColegio.length > 0 && (
                        <>
                          {" "}
                          <span className="text-blue-600 font-semibold">
                            · prefijo centro {prefijoColegio.length}/15
                          </span>
                        </>
                      )}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{15}"
                      maxLength={15}
                      value={libro.codigo}
                      onChange={(e) =>
                        actualizarLibro(libro.id, "codigo", e.target.value)
                      }
                      placeholder="000000000000000"
                      className={`w-full px-2.5 py-1.5 rounded-md border focus:outline-none focus:ring-2 text-sm font-mono tabular-nums ${
                        libro.codigo.length === 0
                          ? "border-slate-300 focus:ring-blue-500"
                          : libro.codigo.length === 15
                          ? "border-emerald-400 bg-emerald-50 focus:ring-emerald-500 text-emerald-900"
                          : "border-amber-400 bg-amber-50 focus:ring-amber-500 text-amber-900"
                      }`}
                    />
                    <div className="mt-0.5 h-1 w-full bg-slate-200 rounded-full overflow-hidden flex">
                      {prefijoColegio.length > 0 && (
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: `${Math.min(
                              (prefijoColegio.length / 15) * 100,
                              100
                            )}%`,
                          }}
                        />
                      )}
                      <div
                        className={`h-full transition-all ${
                          libro.codigo.length === 15
                            ? "bg-emerald-500"
                            : libro.codigo.length >
                              (prefijoColegio.length || 0)
                            ? "bg-amber-500"
                            : "bg-transparent"
                        }`}
                        style={{
                          width: `${
                            libro.codigo.length <=
                            (prefijoColegio.length || 0)
                              ? 0
                              : Math.min(
                                  ((libro.codigo.length -
                                    (prefijoColegio.length || 0)) /
                                    15) *
                                    100,
                                  100
                                )
                          }%`,
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span>{libro.codigo.length}/15 dígitos</span>
                      {prefijoColegio.length > 0 && libro.codigo.length > 0 && (
                        <span className="text-blue-700">
                          · centro {prefijoColegio.length}/
                          {prefijoColegio.length}
                        </span>
                      )}
                      {prefijoColegio.length > 0 &&
                        libro.codigo.length >= prefijoColegio.length &&
                        libro.codigo.length < 15 && (
                          <span className="text-amber-700">
                            · ejemplar{" "}
                            {libro.codigo.length - prefijoColegio.length}/
                            {15 - prefijoColegio.length}
                          </span>
                        )}
                      {prefijoColegio.length > 0 &&
                        libro.codigo.length > 0 &&
                        !libro.codigo.startsWith(prefijoColegio) && (
                          <span className="text-red-600 font-semibold">
                            ⚠ no empieza por el prefijo del centro
                          </span>
                        )}
                    </p>
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 mb-0.5">
                      Título
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={
                          ASIGNATURAS_PREDETERMINADAS.includes(libro.titulo)
                            ? libro.titulo
                            : OPCION_OTRO
                        }
                        onChange={(e) => {
                          const valor = e.target.value;
                          if (valor === OPCION_OTRO) {
                            actualizarLibro(libro.id, "titulo", "");
                          } else {
                            actualizarLibro(libro.id, "titulo", valor);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                      >
                        {ASIGNATURAS_PREDETERMINADAS.map((asig) => (
                          <option key={asig} value={asig}>
                            {asig}
                          </option>
                        ))}
                        <option value={OPCION_OTRO}>{OPCION_OTRO}</option>
                      </select>
                      {!ASIGNATURAS_PREDETERMINADAS.includes(libro.titulo) && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={libro.titulo}
                            onChange={(e) =>
                              actualizarLibro(
                                libro.id,
                                "titulo",
                                e.target.value
                              )
                            }
                            placeholder="Escribe el título personalizado..."
                            className="flex-1 px-2.5 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-10 sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-0.5">
                      Estado
                    </label>
                    <select
                      value={libro.estado}
                      onChange={(e) =>
                        actualizarLibro(libro.id, "estado", e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      {ESTADOS_LIBRO.map((est) => (
                        <option key={est} value={est}>
                          {est}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex items-end justify-end">
                    <button
                      onClick={() => quitarLibro(libro.id)}
                      disabled={libros.length <= 1}
                      title={libros.length <= 1 ? "Debe haber al menos un ejemplar" : "Quitar"}
                      className="p-1.5 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col">
          <div className="no-print mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Vista previa
            </h2>
            <span className="text-xs text-slate-500">
              El resultado impreso será en hoja A4
            </span>
          </div>

          <div className="flex justify-center lg:justify-start">
            <div className="recibo-paper bg-white shadow-lg border border-slate-200 rounded-sm p-6 md:p-8 w-full max-w-[210mm] min-h-[297mm] flex flex-col">
              <div className="flex-1 space-y-5">
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 gap-2">
                  <div className="flex-shrink-0">
                    <img
                      src="/logo_accede.svg"
                      alt="Logo Accede"
                      className="h-10 w-auto"
                    />
                  </div>
                  <div className="flex-1 text-center px-1">
                    {nombreColegio && (
                      <p className="text-[11px] md:text-xs font-semibold text-slate-700 mb-0.5 uppercase tracking-wide">
                        {nombreColegio}
                      </p>
                    )}
                    <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-tight">
                      RECIBO DE ENTREGA DE EJEMPLARES
                    </h1>
                  </div>
                  <div className="flex-shrink-0">
                    <img
                      src="/logo_comunidad-madrid.svg"
                      alt="Logo Comunidad de Madrid"
                      className="h-20 w-auto"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 font-semibold text-slate-700">
                      Nombre:
                    </div>
                    <div className="col-span-2 text-slate-900 border-b border-slate-300 pb-0.5 pl-1">
                      {nombreAlumno || "\u00A0"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 font-semibold text-slate-700">
                      Curso/Grupo:
                    </div>
                    <div className="col-span-2 text-slate-900 border-b border-slate-300 pb-0.5 pl-1">
                      {cursoGrupo || "\u00A0"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 font-semibold text-slate-700">
                      Fecha de entrega:
                    </div>
                    <div className="col-span-2 text-slate-900 border-b border-slate-300 pb-0.5 pl-1">
                      {fechaEntrega || "\u00A0"}
                    </div>
                  </div>
                  {ubicacion && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1 font-semibold text-slate-700">
                        Ubicación:
                      </div>
                      <div className="col-span-2 text-slate-900 border-b border-slate-300 pb-0.5 pl-1">
                        {ubicacion}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-800 mb-3 font-medium">
                    Se le han entregado al Alumno los siguientes ejemplares:
                  </p>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border border-slate-400 px-2 py-2 text-center font-semibold text-slate-800 w-[34%]">
                          Código
                        </th>
                        <th className="border border-slate-400 px-2 py-2 text-center font-semibold text-slate-800 w-[48%]">
                          Título
                        </th>
                        <th className="border border-slate-400 px-2 py-2 text-center font-semibold text-slate-800 w-[18%]">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {librosValidos.map((libro) => (
                        <tr key={libro.id}>
                          <td className="border border-slate-400 px-2 py-2 text-slate-900 align-top font-mono text-[12.5px] tracking-[0.12em] tabular-nums">
                            {libro.codigo}
                          </td>
                          <td className="border border-slate-400 px-2 py-2 text-slate-900 align-top">
                            {libro.titulo || "\u00A0"}
                          </td>
                          <td className="border border-slate-400 px-2 py-2 text-slate-900 text-center align-top">
                            {libro.estado || "\u00A0"}
                          </td>
                        </tr>
                      ))}
                      {librosValidos.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="border border-slate-400 px-2 py-6 text-center text-slate-400 italic text-sm"
                          >
                            (Añade ejemplares con Código Accede válido para que aparezcan aquí)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="recibo-footer">
                <div className="pt-8 mt-8 grid grid-cols-1">
                  <div className="text-center max-w-md mx-auto w-full">
                    <div className="border-t border-slate-800 pt-2">
                      <p className="text-xs font-semibold text-slate-800">
                        FIRMA DEL ALUMNO / PADRE
                      </p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {nombreAlumno || "Nombre y apellidos"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 text-[9px] text-slate-500 leading-relaxed border-t border-slate-200">
                  Los datos personales recogidos en este formulario serán tratados de conformidad con
                  el Reglamento Europeo (UE) 2016/679 de Protección de Datos. La información relativa
                  a los destinatarios de los datos, la finalidad y las medidas de seguridad, así como
                  cualquier información adicional relativa a la protección de sus datos personales,
                  podrá consultarla en la documentación del centro. Ante el responsable del
                  tratamiento podrá ejercer, entre otros, sus derechos de acceso, rectificación,
                  supresión, oposición y limitación de tratamiento.
                </div>
              </div>
            </div>
          </div>
        </section>
        <footer className="no-print mt-10 border-t border-slate-200 py-5 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-600">{version.appName}</span>
            <span className="mx-2 text-slate-300">·</span>
            <span>
              Versión{" "}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-700">
                v{version.version}
              </code>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Build: <span className="font-medium text-slate-600">{version.buildDate}</span>
            </span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="flex items-center gap-1">
              Commit:{" "}
              <code
                className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-700"
                title={version.buildCommit}
              >
                {version.buildCommit.slice(0, 8)}
              </code>
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
