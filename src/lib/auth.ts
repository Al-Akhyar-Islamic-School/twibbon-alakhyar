import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { emailDomainAllowed, ALLOWED_DOMAIN } from './domain';
import { prisma } from './db';

// Auth.js (NextAuth v5). Google OAuth restricted to *.alakhyar.sch.id.
// The `hd` hint below only nudges Google's account chooser toward the main
// domain — the authoritative check is the server-side signIn callback, which
// also accepts subdomains (sd./smp./sma.alakhyar.sch.id).

const hasGoogle = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: hasGoogle
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          authorization: {
            params: { hd: ALLOWED_DOMAIN, prompt: 'select_account' },
          },
        }),
      ]
    : [],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      // Authoritative domain gate (backend, not just client) — FR-09.
      if (!emailDomainAllowed(user.email)) return false;
      // Upsert the staff record on first login.
      await prisma.user.upsert({
        where: { email: user.email! },
        update: { name: user.name ?? undefined, image: user.image ?? undefined },
        create: {
          email: user.email!,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
