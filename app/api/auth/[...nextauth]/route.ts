import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// List of admin email addresses that are allowed to access the admin panel
const ADMIN_EMAILS = ["admin@papapi-gaming.com", "vince.soliza@casualkiosk.com.au"]

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.role = ADMIN_EMAILS.includes(user.email || "") ? "admin" : "user"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
      }
      return session
    },
    async signIn({ user }) {
      // Allow all users to sign in, middleware will restrict access
      return true
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
