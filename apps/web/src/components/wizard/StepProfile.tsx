"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import type { ProfileInput } from "@/lib/api/ideas";
import { COUNTRY_OPTIONS, HEARD_FROM_OPTIONS, PROFILE_KIND_OPTIONS, STAGE_OPTIONS, relabel } from "./profile-options";

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
  const { t } = useI18n();
  return (
    <label className="flex flex-col gap-2 text-small text-text-secondary">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        <option value="">{t.wizard.preferNotToSay}</option>
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
  const { t, href } = useI18n();
  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => onChange({ ...profile, [key]: value });
  // The API refuses a contact without consent: say it here instead of failing on submit.
  const contactWithoutConsent = profile.contact.trim() !== "" && !profile.contactConsent;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="text-center">
        <h1 className="text-h2-mobile font-semibold md:text-h2">{t.wizard.profileTitle}</h1>
        <p className="mt-2 text-body text-text-secondary">
          {t.wizard.profileIntro}
        </p>
      </div>

      <Select label={t.wizard.profileCountry} value={profile.country} options={relabel(COUNTRY_OPTIONS, t.profileLabels.countries)} onChange={(v) => set("country", v)} />
      <label className="flex flex-col gap-2 text-small text-text-secondary">
        {t.wizard.profileCity}
        <input value={profile.city} maxLength={80} onChange={(e) => set("city", e.target.value)} className={fieldClass} />
      </label>
      <Select label={t.wizard.profileKind} value={profile.profile} options={relabel(PROFILE_KIND_OPTIONS, t.profileLabels.kinds)} onChange={(v) => set("profile", v)} />
      <Select label={t.wizard.profileStage} value={profile.stage} options={relabel(STAGE_OPTIONS, t.profileLabels.stages)} onChange={(v) => set("stage", v)} />
      <Select
        label={t.wizard.profileHeardFrom}
        value={profile.heardFrom}
        options={relabel(HEARD_FROM_OPTIONS, t.profileLabels.heardFrom)}
        onChange={(v) => set("heardFrom", v)}
      />

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <label className="flex flex-col gap-2 text-small text-text-secondary">
          {t.wizard.profileContact}
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
          {t.wizard.profileConsent}
        </label>
        <p className="text-micro text-text-secondary">
          {t.wizard.profileContactUse}{" "}
          <Link href={href("/confidentialite")} target="_blank" className="underline underline-offset-2">
            {t.wizard.learnMore}
          </Link>
        </p>
        {contactWithoutConsent ? (
          <p className="text-small text-warning">{t.wizard.profileConsentMissing}</p>
        ) : null}
      </div>

      {error ? <p className="text-small text-error">{error}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          {t.common.back}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            className="rounded-lg border border-border px-5 py-3 text-body font-medium text-text-primary disabled:opacity-40"
          >
            {t.wizard.skip}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || contactWithoutConsent}
            className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
          >
            {submitting ? t.common.saving : t.common.seeResults}
          </button>
        </div>
      </div>
    </div>
  );
}
