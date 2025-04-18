import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// List of admin email addresses that are allowed to access the admin panel
const ADMIN_EMAILS = [
  "admin@papapi-gaming.com", // Original admin email
  "vince.soliza@casualkiosk.com.au", // Added new admin email
]

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    // Add admin role to the session if the user's email is in the ADMIN_EMAILS list
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string
      }
      return session
    },
    // Add role to the token
    async jwt({ token }) {
      if (token?.email && ADMIN_EMAILS.includes(token.email)) {
        token.role = "admin"
      }
      return token
    },
    // Only allow sign-in if the user's email is in the ADMIN_EMAILS list
    async signIn({ user }) {
      return user?.email ? ADMIN_EMAILS.includes(user.email) : false
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
