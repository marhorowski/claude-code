import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - /login           (login page)
     * - /f/:token        (public external forms)
     * - /api/public-forms (public form API)
     * - /api/auth        (NextAuth endpoints)
     * - /_next           (Next.js internals)
     * - /favicon.ico, /robots.txt, /sitemap.xml, static files
     */
    "/((?!login|f/|api/public-forms|api/auth|_next/static|_next/image|favicon\\.ico|robots\\.txt).*)",
  ],
};
