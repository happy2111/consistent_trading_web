import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import {
  authTelegramUser,
  fetchVerificationStatus,
  upsertGoogleUser,
} from "@/lib/api";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      id: "telegram",
      name: "Telegram",
      credentials: {
        id: { label: "id", type: "text" },
        first_name: { label: "first_name", type: "text" },
        last_name: { label: "last_name", type: "text" },
        username: { label: "username", type: "text" },
        photo_url: { label: "photo_url", type: "text" },
        auth_date: { label: "auth_date", type: "text" },
        hash: { label: "hash", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.id || !credentials?.hash) return null;
        try {
          const user = await authTelegramUser({
            id: String(credentials.id),
            first_name: credentials.first_name ? String(credentials.first_name) : undefined,
            last_name: credentials.last_name ? String(credentials.last_name) : undefined,
            username: credentials.username ? String(credentials.username) : undefined,
            photo_url: credentials.photo_url ? String(credentials.photo_url) : undefined,
            auth_date: credentials.auth_date ? String(credentials.auth_date) : undefined,
            hash: String(credentials.hash),
          });

          if (!user) return null;

          return {
            id: user.id,
            name:
              `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
              user.username ||
              "Telegram User",
            email: user.email || undefined,
            image: user.image || undefined,
            telegramId: String(user.telegramId),
            verified: Boolean(user.verified),
            role: user.role || "USER",
          };
        } catch (err) {
          console.error("Telegram authorize error:", err);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "telegram" && user) {
        token.userId = user.id;
        token.telegramId = (user as any).telegramId;
        token.name = user.name;
        token.picture = user.image;
        token.verified = (user as any).verified;
        token.role = (user as any).role || "USER";
      }

      if (account?.provider === "google" && profile?.sub && profile.email) {
        const name = profile.name ?? "";
        const [firstName, ...rest] = name.trim().split(/\s+/);
        const lastName = rest.join(" ") || undefined;

        const u = await upsertGoogleUser({
          googleId: profile.sub,
          email: profile.email,
          firstName: firstName || undefined,
          lastName,
          image: profile.picture,
        });

        token.googleId = profile.sub;
        token.email = profile.email;
        token.name = profile.name;
        token.picture = profile.picture;
        token.userId = u?.id ?? null;
      }

      // Always sync verification status and latest role from database
      const identifier =
        token.googleId || token.telegramId || (token.userId as string);
      if (identifier) {
        const status = await fetchVerificationStatus(String(identifier));
        token.verified = status.verified;
        token.role = status.role || "USER";
        if (status.userId) token.userId = status.userId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) || (token.sub as string) || "";
        session.user.googleId = token.googleId as string | undefined;
        session.user.telegramId = token.telegramId as string | undefined;
        session.user.verified = Boolean(token.verified);
        session.user.role = (token.role as "ADMIN" | "USER") || "USER";
      }
      return session;
    },
    async signIn({ account, profile, user }) {
      if (account?.provider === "telegram") return Boolean(user?.id);
      return account?.provider === "google" && Boolean(profile?.email);
    },
  },
  session: { strategy: "jwt", maxAge: 60 * 60, updateAge: 60 * 5 },
  jwt: { maxAge: 60 * 60 },
});
