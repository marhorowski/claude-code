/** Pola nowego konta do logowania (używane w kilku formularzach). */
export function NewUserFields({ required = true }: { required?: boolean }) {
  return (
    <>
      <label className="block">
        <span className="label">Imię i nazwisko</span>
        <input name="userName" required={required} autoComplete="off" className="input" />
      </label>
      <label className="block">
        <span className="label">Email (login)</span>
        <input name="email" type="email" required={required} autoComplete="off" className="input" />
      </label>
      <label className="block">
        <span className="label">Hasło startowe</span>
        <input name="password" type="text" required={required} minLength={8} autoComplete="off" className="input" />
        <span className="mt-1 block text-[12px] text-muted">Min. 8 znaków. Osoba zmieni je w „Moje konto”.</span>
      </label>
    </>
  );
}
