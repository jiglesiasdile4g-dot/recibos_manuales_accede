import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSessionToken,
  getCredentials,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
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
    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
