import NextAuth from "next-auth";
import { AuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import EmailProvider from "next-auth/providers/email";
import PostHogClient from "@/posthog";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: "apikey",
          pass: process.env.SENDGRID_API_KEY,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  pages: {
    signIn: "/signin",
    signOut: "/",
    error: "/error",
    verifyRequest: "/verify-request",
    newUser: "/signup",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        try {
          // Load user's purchased credits
          const u = await prisma.user.findUnique({ where: { id: user.id } });
          // @ts-ignore: add custom field
          token.credits = u?.credits ?? 0;
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId || token.sub;
        // @ts-ignore: attach credits to session
        session.user.credits = token.credits ?? 0;
      }
      return session;
    },
  },
  // Analytics events for user lifecycle
  events: {
    // When a new user account is created
    createUser: async ({ user }) => {
      try {
        const posthog = PostHogClient();
        await posthog.capture({ distinctId: user.id, event: "user signed up" });
      } catch (err) {
        console.error("PostHog createUser error:", err);
      }
    },
    // On each user sign-in
    signIn: async ({ user }) => {
      try {
        const posthog = PostHogClient();
        await posthog.capture({ distinctId: user.id, event: "user logged in" });
      } catch (err) {
        console.error("PostHog signIn error:", err);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
const { auth } = NextAuth(authOptions);

export { handler as GET, handler as POST, auth };
