"use server"

import { cookies } from "next/headers"

// This is a simplified auth system for demo purposes
// In a real application, you would use a more robust auth system

export async function login(formData: FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  // Hardcoded credentials for demo - in a real app, you would check against a database
  if (username === "admin" && password === "papapi123") {
    // Set a cookie to indicate the user is authenticated
    cookies().set("admin-auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    })

    return { success: true }
  }

  return { success: false, error: "Invalid credentials" }
}

export async function logout() {
  cookies().delete("admin-auth")
  return { success: true }
}

export async function getAuthStatus() {
  const authCookie = cookies().get("admin-auth")
  return { isAuthenticated: authCookie?.value === "authenticated" }
}
