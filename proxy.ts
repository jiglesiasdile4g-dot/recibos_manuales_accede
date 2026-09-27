import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  verifySessionToken,
} from "./lib/auth";

const PUBLIC_PATHS = ["/login"];
const PUBLIC_API_PATHS = ["/api/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isPublicApi = PUBLIC_API_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isAsset =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|webp|css|js)$/i) !== null;

  if (isPublicPath || isPublicApi || isAsset) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = token ? await verifySessionToken(token) : false;

  if (!authenticated) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
      if (token) {
        res.cookies.set({
          name: SESSION_COOKIE_NAME,
          value: "",
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 0,
        });
      }
      return res;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirected", "1");
    const res = NextResponse.redirect(url);
    if (token) {
      res.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: "",
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
      });
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
