"use client";

import { useStore } from "@/lib/store";
import { Volume2, VolumeX } from "lucide-react";
import { sndTaskAdded } from "@/lib/sounds";

export default function SettingsView() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const num =
    (
      key:
        | "workMin"
        | "breakMin"
        | "longBreakMin"
        | "sessionsBeforeLongBreak"
        | "targetHoursPerDay"
        | "pulseIntervalMin"
    ) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateSettings({ [key]: Math.max(1, Number(e.target.value) || 1) });

  const hour =
    (key: "pulseFromHour" | "pulseToHour") =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateSettings({
        [key]: Math.min(24, Math.max(0, Number(e.target.value) || 0)),
      });

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="font-display text-3xl text-stone2-100">Ustawienia</h2>

      <section className="card p-5 space-y-4">
        <h3 className="font-display text-xl text-bronze-300">
          Pomodoro — interwały
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Praca (min)</label>
            <input
              type="number"
              className="input"
              value={settings.workMin}
              onChange={num("workMin")}
            />
          </div>
          <div>
            <label className="label">Przerwa (min)</label>
            <input
              type="number"
              className="input"
              value={settings.breakMin}
              onChange={num("breakMin")}
            />
          </div>
          <div>
            <label className="label">Długa przerwa (min)</label>
            <input
              type="number"
              className="input"
              value={settings.longBreakMin}
              onChange={num("longBreakMin")}
            />
          </div>
          <div>
            <label className="label">Sesje do długiej przerwy</label>
            <input
              type="number"
              className="input"
              value={settings.sessionsBeforeLongBreak}
              onChange={num("sessionsBeforeLongBreak")}
            />
          </div>
        </div>
        <p className="text-xs text-stone2-400">
          Nowe interwały obowiązują od następnego startu timera.
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h3 className="font-display text-xl text-bronze-300">Dźwięki</h3>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="flex items-center gap-2 text-sm text-stone2-200">
            {settings.soundsEnabled !== false ? (
              <Volume2 className="h-4 w-4 text-bronze-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-stone2-400" />
            )}
            Sygnały dźwiękowe
          </span>
          <button
            role="switch"
            aria-checked={settings.soundsEnabled !== false}
            onClick={() => {
              const next = !(settings.soundsEnabled !== false);
              updateSettings({ soundsEnabled: next });
              if (next) sndTaskAdded();
            }}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.soundsEnabled !== false ? "bg-bronze-500" : "bg-ink-600"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink-950 transition-all ${
                settings.soundsEnabled !== false ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </label>
        <p className="text-xs text-stone2-400">
          Dźwięk przy dodaniu zadania, starcie Pomodoro, 5 minut przed końcem
          odliczania, na koniec fazy oraz po zakończeniu zadania.
        </p>
      </section>

      <section className="card p-5 space-y-4">
        <h3 className="font-display text-xl text-bronze-300">Dzień pracy</h3>
        <div>
          <label className="label">Docelowa liczba godzin dziennie</label>
          <input
            type="number"
            className="input"
            value={settings.targetHoursPerDay}
            onChange={num("targetHoursPerDay")}
          />
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h3 className="font-display text-xl text-bronze-300">
          Puls potencjału
        </h3>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm text-stone2-200">
            Pytaj „Czy realizujesz swój potencjał?"
          </span>
          <button
            role="switch"
            aria-checked={settings.pulseEnabled !== false}
            onClick={() =>
              updateSettings({ pulseEnabled: !(settings.pulseEnabled !== false) })
            }
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.pulseEnabled !== false ? "bg-bronze-500" : "bg-ink-600"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink-950 transition-all ${
                settings.pulseEnabled !== false ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Co ile minut</label>
            <input
              type="number"
              className="input"
              value={settings.pulseIntervalMin ?? 15}
              onChange={num("pulseIntervalMin")}
            />
          </div>
          <div>
            <label className="label">Od godziny</label>
            <input
              type="number"
              min={0}
              max={23}
              className="input"
              value={settings.pulseFromHour ?? 8}
              onChange={hour("pulseFromHour")}
            />
          </div>
          <div>
            <label className="label">Do godziny</label>
            <input
              type="number"
              min={1}
              max={24}
              className="input"
              value={settings.pulseToHour ?? 21}
              onChange={hour("pulseToHour")}
            />
          </div>
        </div>
        <p className="text-xs text-stone2-400">
          Odpowiedzi zapisują się i zliczają w Dzienniku. Powiadomienie
          systemowe pojawia się, gdy aplikacja działa w tle (wymaga zgody na
          powiadomienia).
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h3 className="font-display text-xl text-bronze-300">
          Synchronizacja
        </h3>
        <div>
          <label className="label">Klucz synchronizacji</label>
          <input
            className="input"
            value={settings.syncKey ?? "default"}
            onChange={(e) =>
              updateSettings({
                syncKey:
                  e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) ||
                  "default",
              })
            }
          />
        </div>
        <p className="text-xs text-stone2-400">
          Dane zapisują się w bazie danych pod tym kluczem. Wpisz ten sam klucz
          na innym urządzeniu, żeby zobaczyć te same zadania. Zmień na własny,
          trudny do odgadnięcia (np. imię-i-losowe-znaki), żeby nikt inny nie
          trafił na Twoje dane.
        </p>
      </section>

      <section className="card p-5 space-y-4">
        <h3 className="font-display text-xl text-bronze-300">Fokus</h3>
        <div>
          <label className="label">Fokus dnia</label>
          <input
            className="input"
            placeholder="Najważniejsza rzecz na dziś…"
            value={settings.dayFocus}
            onChange={(e) => updateSettings({ dayFocus: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Fokus tygodnia</label>
          <input
            className="input"
            placeholder="Najważniejsza rzecz w tym tygodniu…"
            value={settings.weekFocus}
            onChange={(e) => updateSettings({ weekFocus: e.target.value })}
          />
        </div>
        <p className="text-xs text-stone2-400">
          Fokusy ustawisz też podczas „Ustalania dnia" i „Ustalania tygodnia".
          Zadania oznaczone fokusem dnia podświetlają się na czerwono, fokusem
          tygodnia — na brązowo.
        </p>
      </section>
    </div>
  );
}
