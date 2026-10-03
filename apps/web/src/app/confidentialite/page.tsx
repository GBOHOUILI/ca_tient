import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Confidentialité",
  alternates: { canonical: "/confidentialite" },
  description: "Comment Ça tient ? utilise tes informations et comment les supprimer.",
};

const CONTACT = "contact@zerotoone.bj";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h3-mobile font-semibold md:text-h3">{title}</h2>
      <div className="flex flex-col gap-3 text-body text-text-secondary">{children}</div>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-h2-mobile font-semibold md:text-h2">Confidentialité</h1>
        <p className="mt-2 text-small text-text-secondary">Mise à jour le 3 octobre 2026</p>
      </div>

      <Section title="Qui sommes-nous">
        <p>
          Ça tient ? est édité par ZeroToOne. Pour toute question sur tes informations :{" "}
          <a href={`mailto:${CONTACT}`} className="text-text-primary underline underline-offset-4">
            {CONTACT}
          </a>
          .
        </p>
      </Section>

      <Section title="Ce que nous enregistrons, et pourquoi">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong className="text-text-primary">Ton analyse</strong> (type de business, description, chiffres, business
            model, capital) : pour calculer tes résultats, te permettre de retrouver ton analyse, et améliorer Ça tient ?.
          </li>
          <li>
            <strong className="text-text-primary">Tes réponses facultatives</strong> (pays, ville, profil, avancement du
            projet, comment tu nous as connus) : pour comprendre à qui sert Ça tient ? et l&apos;améliorer.
          </li>
          <li>
            <strong className="text-text-primary">Ton contact</strong> (e-mail ou WhatsApp), uniquement si tu coches la case
            prévue : pour te recontacter au sujet de Ça tient ?. Il n&apos;est jamais vendu ni partagé.
          </li>
          <li>
            <strong className="text-text-primary">Des statistiques de visite</strong> (pages vues, étapes du parcours), sans
            cookie publicitaire et sans enregistrer ton adresse IP.
          </li>
        </ul>
      </Section>

      <Section title="Les services que nous utilisons">
        <p>
          Ta description est envoyée à un service d&apos;intelligence artificielle (Google Gemini, et en secours Groq ou
          Mistral) pour te proposer tes hypothèses, ton business model et la synthèse de ton rapport. Les résultats chiffrés,
          eux, sont toujours calculés par nos propres formules.
        </p>
        <p>
          Le paiement se fait sur la page sécurisée de FedaPay : nous ne recevons ni ton numéro de mobile money ni ta carte,
          seulement la confirmation du paiement.
        </p>
        <p>Le site et ses données sont hébergés par Netlify, Render et Neon.</p>
      </Section>

      <Section title="Cookies et stockage">
        <p>
          Un cookie retient ton thème (clair ou sombre). Le stockage de ton navigateur garde l&apos;accès à ton analyse et la
          source de ta visite. Aucun cookie publicitaire.
        </p>
      </Section>

      <Section title="Combien de temps">
        <p>Tes informations sont conservées tant que tu n&apos;en demandes pas la suppression.</p>
      </Section>

      <Section title="Supprimer tes informations">
        <p>
          Si tu as payé ton analyse complète, tu peux la supprimer toi-même avec le lien « Supprimer mon analyse », en bas de
          ton analyse. Sinon, ou pour toute demande d&apos;accès ou de correction, écris à{" "}
          <a href={`mailto:${CONTACT}`} className="text-text-primary underline underline-offset-4">
            {CONTACT}
          </a>{" "}
          avec l&apos;e-mail ou le numéro que tu nous as donné, ou ton code de récupération.
        </p>
        <p>
          Tu peux aussi t&apos;adresser à l&apos;Autorité de protection des données à caractère personnel (APDP) du Bénin.
        </p>
      </Section>

      <Link href="/" className="text-small text-text-secondary underline underline-offset-4">
        ← Retour à l&apos;accueil
      </Link>
    </main>
  );
}
