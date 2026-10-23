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
     * Wszystko OPRÓCZ:
     * - /login, /a/:token (publiczne ankiety), /api/public-survey, /api/auth, /api/setup
     * - zasoby Next.js i pliki statyczne
     */
    "/((?!login|a/|api/public-survey|api/auth|api/setup|_next/static|_next/image|favicon\\.ico|robots\\.txt).*)",
  ],
};
