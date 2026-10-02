import Link from "next/link";
import type { ProfileInput } from "@/lib/api/ideas";
import { COUNTRY_OPTIONS, HEARD_FROM_OPTIONS, PROFILE_KIND_OPTIONS, STAGE_OPTIONS } from "./profile-options";

const fieldClass =
  "rounded-lg border border-border bg-surface p-3 text-body text-text-primary focus:border-accent-emerald focus:outline-none";

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-small text-text-secondary">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        <option value="">Je préfère ne pas dire</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StepProfile({
  profile,
  onChange,
  onSubmit,
  onSkip,
  onBack,
  submitting,
  error,
}: {
  profile: ProfileInput;
  onChange: (profile: ProfileInput) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => onChange({ ...profile, [key]: value });
  // The API refuses a contact without consent: say it here instead of failing on submit.
  const contactWithoutConsent = profile.contact.trim() !== "" && !profile.contactConsent;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="text-center">
        <h1 className="text-h2-mobile font-semibold md:text-h2">Parle-nous de toi</h1>
        <p className="mt-2 text-body text-text-secondary">
          Tout est facultatif. Ça nous aide à améliorer Ça tient ? pour des projets comme le tien.
        </p>
      </div>

      <Select label="Dans quel pays veux-tu lancer ton projet ?" value={profile.country} options={COUNTRY_OPTIONS} onChange={(v) => set("country", v)} />
      <label className="flex flex-col gap-2 text-small text-text-secondary">
        Dans quelle ville ?
        <input value={profile.city} maxLength={80} onChange={(e) => set("city", e.target.value)} className={fieldClass} />
      </label>
      <Select label="Tu es..." value={profile.profile} options={PROFILE_KIND_OPTIONS} onChange={(v) => set("profile", v)} />
      <Select label="Ton projet en est où ?" value={profile.stage} options={STAGE_OPTIONS} onChange={(v) => set("stage", v)} />
      <Select
        label="Comment as-tu connu Ça tient ?"
        value={profile.heardFrom}
        options={HEARD_FROM_OPTIONS}
        onChange={(v) => set("heardFrom", v)}
      />

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <label className="flex flex-col gap-2 text-small text-text-secondary">
          Ton e-mail ou ton numéro WhatsApp
          <input
            value={profile.contact}
            maxLength={120}
            autoComplete="email"
            onChange={(e) => set("contact", e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex items-start gap-2 text-small text-text-primary">
          <input
            type="checkbox"
            checked={profile.contactConsent}
            onChange={(e) => set("contactConsent", e.target.checked)}
            className="mt-1"
          />
          J&apos;accepte d&apos;être recontacté par Ça tient ?
        </label>
        <p className="text-micro text-text-secondary">
          Uniquement pour te recontacter au sujet de Ça tient ?, jamais partagé.{" "}
          <Link href="/confidentialite" target="_blank" className="underline underline-offset-2">
            En savoir plus
          </Link>
        </p>
        {contactWithoutConsent ? (
          <p className="text-small text-warning">Coche la case pour qu&apos;on garde ton contact, ou laisse le champ vide.</p>
        ) : null}
      </div>

      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            className="rounded-lg border border-border px-5 py-3 text-body font-medium text-text-primary disabled:opacity-40"
          >
            Passer
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || contactWithoutConsent}
            className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "Enregistrement..." : "Voir mes résultats"}
          </button>
        </div>
      </div>
    </div>
  );
}
