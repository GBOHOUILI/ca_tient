import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t, href } = await getI18n();
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      <h1 className="text-h2-mobile font-semibold md:text-h2">{t.notFound.title}</h1>
      <p className="text-body text-text-secondary">{t.notFound.text}</p>
      <Link href={href("/")} className="text-body font-medium text-accent-emerald hover:underline">
        {t.notFound.back}
      </Link>
    </section>
  );
}
