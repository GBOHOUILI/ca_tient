import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { PUBLISHER } from "@/lib/site";

const linkClass = "hover:text-text-primary";

export async function Footer() {
  const { t, href } = await getI18n();
  const columns = [
    {
      title: t.footer.product,
      links: [
        { href: href("/commencer"), label: t.header.start },
        { href: href("/retrouver"), label: t.header.recover },
        { href: href("/#tarif"), label: t.header.pricing },
        { href: href("/#faq"), label: t.header.faq },
      ],
    },
    {
      title: t.footer.help,
      links: [
        { href: `mailto:${PUBLISHER.email}`, label: PUBLISHER.email },
        { href: href("/confidentialite"), label: t.header.privacy },
      ],
    },
  ];

  return (
    <footer className="border-t border-border px-4 pt-12 pb-8 text-small text-text-secondary sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="text-h4 font-semibold text-text-primary">Ça tient ?</p>
          <p className="mt-2 max-w-xs">{t.footer.tagline}</p>
          <p className="mt-4">
            {t.footer.productBy}{" "}
            <a href={PUBLISHER.url} className="font-medium text-accent-emerald hover:underline">
              ZeroToOne
            </a>
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="font-semibold text-text-primary">{column.title}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("/") ? (
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className={`${linkClass} break-all`}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-5xl flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} ZeroToOne · Ça tient ?</p>
        <p>
          <a href={PUBLISHER.url} className={linkClass}>
            zerotoone.bj
          </a>
        </p>
      </div>
    </footer>
  );
}
