import { NextResponse } from "next/server";
import {
  createSessionToken,
  getCredentials,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  verifySessionToken,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userInput = String(body?.username ?? "").trim();
    const passInput = String(body?.password ?? "");

    const creds = getCredentials();

    if (
      userInput !== creds.username ||
      passInput !== creds.password ||
      !userInput ||
      !passInput
    ) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const token = await createSessionToken(userInput);
    const sanity = await verifySessionToken(token);
    if (!sanity) {
      return NextResponse.json(
        { error: "Error generando la sesión." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
