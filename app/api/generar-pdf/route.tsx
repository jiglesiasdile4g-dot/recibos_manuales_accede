import { NextRequest, NextResponse } from "next/server";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image as PdfImage,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

const LONGITUD_CODIGO_ACCEDER = 15;
const REGEX_CODIGO_ACCEDER = /^\d{15}$/;

interface LibroApi {
  codigo: string;
  titulo: string;
  estado: string;
}

interface GenerarPdfBody {
  nombreColegio?: string;
  nombreAlumno: string;
  cursoGrupo: string;
  fechaEntrega: string;
  ubicacion: string;
  libros: LibroApi[];
}

function validarBody(body: unknown): { ok: true; data: GenerarPdfBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Cuerpo de la petición inválido." };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.nombreAlumno !== "string" || !b.nombreAlumno.trim()) {
    return { ok: false, error: "Falta nombre del alumno." };
  }
  if (typeof b.cursoGrupo !== "string" || !b.cursoGrupo.trim()) {
    return { ok: false, error: "Falta curso / grupo." };
  }
  if (typeof b.fechaEntrega !== "string" || !b.fechaEntrega.trim()) {
    return { ok: false, error: "Falta fecha de entrega." };
  }
  if (typeof b.ubicacion !== "string" || !b.ubicacion.trim()) {
    b.ubicacion = "Biblioteca";
  }
  if (!Array.isArray(b.libros)) {
    return { ok: false, error: "Falta la lista de ejemplares." };
  }
  const libros: LibroApi[] = [];
  for (const lRaw of b.libros as unknown[]) {
    if (!lRaw || typeof lRaw !== "object") continue;
    const l = lRaw as Record<string, unknown>;
    const codigo = typeof l.codigo === "string" ? l.codigo.trim() : "";
    const titulo = typeof l.titulo === "string" ? l.titulo.trim() : "";
    const estado = typeof l.estado === "string" && l.estado.trim().length > 0 ? l.estado.trim() : "Nuevo";
    if (!REGEX_CODIGO_ACCEDER.test(codigo) || !titulo) continue;
    libros.push({ codigo, titulo, estado });
  }
  if (libros.length === 0) {
    return { ok: false, error: "Ningún ejemplar válido (código 15 dígitos + título)." };
  }
  return {
    ok: true,
    data: {
      nombreColegio: typeof b.nombreColegio === "string" ? b.nombreColegio.trim() : "",
      nombreAlumno: b.nombreAlumno.trim(),
      cursoGrupo: b.cursoGrupo.trim(),
      fechaEntrega: b.fechaEntrega.trim(),
      ubicacion: (b.ubicacion as string).trim(),
      libros,
    },
  };
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 18,
    fontSize: 10,
    color: "#0f172a",
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  pageInner: {
    flex: 1,
    minHeight: "100%",
    flexDirection: "column",
  },
  body: {
    flex: 1,
    flexGrow: 1,
  },
  pageFooter: {
    marginTop: "auto",
    flexShrink: 0,
    paddingTop: 12,
  },

  firmaBlock: {
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  firmaSeparator: {
    width: "100%",
    height: 2,
    backgroundColor: "#000000",
    marginBottom: 8,
  },
  firmaLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    color: "#0f172a",
    marginBottom: 2,
  },
  firmaNombre: {
    fontSize: 10,
    textAlign: "center",
    color: "#334155",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottom: 2,
    borderBottomColor: "#0f172a",
    marginBottom: 14,
    gap: 8,
  },
  logoBox: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBoxRight: {
    width: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  logoRight: {
    width: 90,
    height: 90,
    objectFit: "contain",
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  colegio: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    color: "#0f172a",
  },
  datosRow: {
    flexDirection: "row",
    marginVertical: 4,
    alignItems: "flex-end",
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f172a",
    marginRight: 6,
  },
  subrayado: {
    flex: 1,
    borderBottom: 1,
    borderBottomColor: "#0f172a",
    paddingHorizontal: 4,
    paddingBottom: 1,
    fontSize: 10,
    color: "#0f172a",
  },
  grid3: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
  },
  cell: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 2,
  },
  tablaWrap: {
    marginTop: 14,
    marginBottom: 10,
  },
  tablaHead: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderTop: 1,
    borderTopColor: "#0f172a",
    borderBottom: 1,
    borderBottomColor: "#0f172a",
  },
  tablaHeadCell: {
    fontWeight: "bold",
    fontSize: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    color: "#0f172a",
    borderRight: 1,
    borderRightColor: "#cbd5e1",
  },
  tablaRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#cbd5e1",
  },
  tablaCell: {
    fontSize: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    color: "#0f172a",
    borderRight: 1,
    borderRightColor: "#e2e8f0",
  },
  colCodigo: { width: "32%" },
  colTitulo: { width: "50%" },
  colEstado: { width: "18%", borderRightWidth: 0 },

  legal: {
    marginTop: 0,
    paddingTop: 10,
    borderTop: 1,
    borderTopColor: "#e2e8f0",
    paddingBottom: 14,
    fontSize: 7,
    lineHeight: 1.3,
    color: "#64748b",
  },
});

async function cargarLogo(nombre: string) {
  try {
    const publicDir = path.join(process.cwd(), "public");
    const bytes = await fs.readFile(path.join(publicDir, nombre));
    const mime = nombre.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "image/png";
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function ReciboDocument({
  data,
  logoAccede,
  logoMadrid,
}: {
  data: GenerarPdfBody;
  logoAccede: string | null;
  logoMadrid: string | null;
}) {
  return (
    <Document
      author={data.nombreColegio || "Generador de Recibos"}
      subject={`Recibo de entrega - ${data.nombreAlumno}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.pageInner}>
          <View style={styles.body}>
            <View style={styles.header}>
              <View style={styles.logoBox}>
                {logoAccede ? (
                  <PdfImage src={logoAccede} style={styles.logo} />
                ) : (
                  <View style={styles.logo} />
                )}
              </View>
              <View style={styles.titleBlock}>
                {data.nombreColegio ? (
                  <Text style={styles.colegio}>{data.nombreColegio}</Text>
                ) : null}
                <Text style={styles.title}>RECIBO DE ENTREGA DE EJEMPLARES</Text>
              </View>
              <View style={styles.logoBoxRight}>
                {logoMadrid ? (
                  <PdfImage src={logoMadrid} style={styles.logoRight} />
                ) : (
                  <View style={styles.logoRight} />
                )}
              </View>
            </View>

            <View style={styles.datosRow}>
              <Text style={styles.label}>Nombre del alumno/a:</Text>
              <Text style={styles.subrayado}>{data.nombreAlumno}</Text>
            </View>

            <View style={styles.grid3}>
              <View style={styles.cell}>
                <Text style={styles.smallLabel}>Curso / Grupo</Text>
                <Text style={styles.subrayado}>{data.cursoGrupo}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.smallLabel}>Fecha de entrega</Text>
                <Text style={styles.subrayado}>{data.fechaEntrega}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.smallLabel}>Ubicación</Text>
                <Text style={styles.subrayado}>{data.ubicacion}</Text>
              </View>
            </View>

            <View style={styles.tablaWrap}>
              <View style={styles.tablaHead}>
                <Text style={{ ...styles.tablaHeadCell, ...styles.colCodigo }}>Código</Text>
                <Text style={{ ...styles.tablaHeadCell, ...styles.colTitulo }}>Título</Text>
                <Text style={{ ...styles.tablaHeadCell, ...styles.colEstado }}>Estado</Text>
              </View>
              {data.libros.map((libro, i) => (
                <View key={i} style={styles.tablaRow}>
                  <Text style={{ ...styles.tablaCell, ...styles.colCodigo, fontFamily: "Courier" }}>
                    {libro.codigo}
                  </Text>
                  <Text style={{ ...styles.tablaCell, ...styles.colTitulo }}>{libro.titulo}</Text>
                  <Text style={{ ...styles.tablaCell, ...styles.colEstado }}>{libro.estado}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.pageFooter}>
            <View style={styles.firmaBlock}>
              <View style={styles.firmaSeparator} />
              <Text style={styles.firmaLabel}>FIRMA DEL ALUMNO / PADRE</Text>
              <Text style={styles.firmaNombre}>{data.nombreAlumno}</Text>
            </View>

            <Text style={styles.legal}>
              Los datos personales recogidos serán tratados de conformidad con el Reglamento Europeo (UE) 2016/679
              de Protección de Datos. La información relativa a los destinatarios de los datos, la finalidad y las
              medidas de seguridad, así como cualquier información adicional relativa a la protección de sus datos
              personales, podrá consultarla en la documentación del centro. Ante el responsable del tratamiento
              podrá ejercer, entre otros, sus derechos de acceso, rectificación, supresión, oposición y limitación de
              tratamiento.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const validado = validarBody(body);
    if (!validado.ok) {
      return NextResponse.json({ error: validado.error }, { status: 400 });
    }
    const [logoAccede, logoMadrid] = await Promise.all([
      cargarLogo("logo_accede.svg"),
      cargarLogo("logo_comunidad-madrid.svg"),
    ]);
    const buffer = await renderToBuffer(
      <ReciboDocument data={validado.data} logoAccede={logoAccede} logoMadrid={logoMadrid} />
    );
    const nombreAlumno = validado.data.nombreAlumno.replace(/[\\/:*?"<>|]+/g, "_");
    const filename = `Recibo de entrega de ${nombreAlumno}.pdf`;
    const bodyInit = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    return new NextResponse(bodyInit as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error inesperado generando el PDF.",
      },
      { status: 500 }
    );
  }
}
