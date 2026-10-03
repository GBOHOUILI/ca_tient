import type { ReactNode } from "react";
import { PUBLISHER } from "@/lib/site";

const CONTACT = PUBLISHER.email;

export function PrivacyFr({ Section }: { Section: (props: { title: string; children: ReactNode }) => ReactNode }) {
  return (
    <>
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
          Un cookie retient ton thème (clair ou sombre), un autre ton choix si tu fermes la suggestion de langue. Le stockage de ton navigateur garde l&apos;accès à ton analyse et la
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

    </>
  );
}
