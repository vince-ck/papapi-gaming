import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Check if the user is trying to access an admin route
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")

  // If it's an admin route and the user is not an admin, redirect to home
  if (isAdminRoute && (!token || token.role !== "admin")) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

// Specify which routes this middleware should run on
export const config = {
  matcher: ["/admin/:path*"],
}
