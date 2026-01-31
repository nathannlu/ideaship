import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPaths = ["/chat"];
const authRoutes = ["/signin", "/signup", "/verify-request"];
const DOMAIN = "ideaship.io"; // 👈 your real domain

function getSubdomain(hostname: string) {
  if (hostname === DOMAIN || hostname === `www.${DOMAIN}`) return null;
  return hostname.endsWith(`.${DOMAIN}`)
    ? hostname.replace(`.${DOMAIN}`, "")
    : null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const subdomain = getSubdomain(hostname);

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // ✅ Rewrite subdomains like xyz.ideaship.io → /_sites/xyz/...
  if (subdomain) {
    const url = request.nextUrl.clone();
    url.pathname = `/sites/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ✅ Auth-protected routing for root domain
  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  const isAuthRoute = authRoutes.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtectedPath && !token) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("callbackUrl", encodeURI(pathname));
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && token) {
    // If user is already authenticated, redirect auth routes to home
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Do not auto-redirect authenticated users away from landing page
  // if (pathname === "/" && token) {
  //   return NextResponse.redirect(new URL("/chat", request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
