import Link from "next/link";
import { PUBLISHER } from "@/lib/site";

const linkClass = "hover:text-text-primary";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { href: "/commencer", label: "Tester mon idée" },
      { href: "/retrouver", label: "Retrouver mon analyse" },
      { href: "/#tarif", label: "Tarif" },
      { href: "/#faq", label: "Questions fréquentes" },
    ],
  },
  {
    title: "Aide",
    links: [
      { href: `mailto:${PUBLISHER.email}`, label: PUBLISHER.email },
      { href: "/confidentialite", label: "Confidentialité" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border px-4 pt-12 pb-8 text-small text-text-secondary sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="text-h4 font-semibold text-text-primary">Ça tient ?</p>
          <p className="mt-2 max-w-xs">Teste les chiffres de ton idée de business avant d&apos;investir ton argent.</p>
          <p className="mt-4">
            Un produit{" "}
            <a href={PUBLISHER.url} className="font-medium text-accent-emerald hover:underline">
              ZeroToOne
            </a>
          </p>
        </div>
        {COLUMNS.map((column) => (
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
