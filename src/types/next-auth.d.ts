import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      clients: Array<{ id: string; name: string }>;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    clients: Array<{ id: string; name: string }>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    clients: Array<{ id: string; name: string }>;
  }
}
