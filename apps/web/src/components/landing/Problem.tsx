import { getI18n } from "@/i18n/server";

export async function Problem() {
  const { t } = await getI18n();
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <h2 className="text-center text-h2-mobile font-semibold md:text-h2">{t.landing.problemTitle}</h2>
      <ul className="mt-10 flex flex-col gap-4">
        {t.landing.problems.map((situation) => (
          <li key={situation} className="border-l-[3px] border-l-warning pl-4 text-body text-text-primary">
            {situation}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-body text-text-secondary">{t.landing.problemOutro}</p>
    </section>
  );
}
