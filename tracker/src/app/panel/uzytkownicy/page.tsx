import { redirect } from "next/navigation";

// Dawny adres: zarządzanie kontami jest teraz w zakładce Klienci.
export default function UsersRedirect() {
  redirect("/panel/klienci");
}
