export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 text-center text-small text-text-secondary sm:px-6">
      <p>Ça tient ? Teste les chiffres de ton idée avant d&apos;investir.</p>
      <p className="mt-1">© {new Date().getFullYear()} Ça tient ?</p>
    </footer>
  );
}
