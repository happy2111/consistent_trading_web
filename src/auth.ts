import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import {
  fetchVerificationStatus,
  upsertGoogleUser,
} from "@/lib/api";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.sub && profile.email) {
        const name = profile.name ?? "";
        const [firstName, ...rest] = name.trim().split(/\s+/);
        const lastName = rest.join(" ") || undefined;

        const user = await upsertGoogleUser({
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
        token.userId = user?.id ?? null;
      }

      // Always sync verification status and latest role from database
      if (token.googleId) {
        const status = await fetchVerificationStatus(String(token.googleId));
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
        session.user.verified = Boolean(token.verified);
        session.user.role = (token.role as "ADMIN" | "USER") || "USER";
      }
      return session;
    },
    async signIn({ account, profile }) {
      return account?.provider === "google" && Boolean(profile?.email);
    },
  },
  // Ensure token refreshed each request to get latest role
  session: { strategy: "jwt", maxAge: 60 * 60, updateAge: 0 }, // 1 h session, refresh every request
  jwt: { maxAge: 60 * 60 }, // refresh token on every request (updateAge handled by session)
});
