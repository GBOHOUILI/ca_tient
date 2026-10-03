import Link from "next/link";

const linkClass = "underline underline-offset-4 hover:text-text-primary";

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 text-center text-small text-text-secondary sm:px-6">
      <p>Ça tient ? Teste les chiffres de ton idée avant d&apos;investir.</p>
      <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/retrouver" className={linkClass}>
          Retrouver mon analyse
        </Link>
        <Link href="/confidentialite" className={linkClass}>
          Confidentialité
        </Link>
        <a href="mailto:contact@zerotoone.bj" className={linkClass}>
          contact@zerotoone.bj
        </a>
      </p>
      <p className="mt-2">© {new Date().getFullYear()} ZeroToOne · Ça tient ?</p>
    </footer>
  );
}
