const faqs = [
  {
    question: "Qu'est-ce qui est gratuit ?",
    answer:
      "Tout jusqu'à l'aperçu : la description de ton idée, les hypothèses proposées par l'IA, ton chiffre d'affaires, ta marge, ton résultat, ton seuil de rentabilité et le verdict. Tu ne paies que pour l'analyse complète.",
  },
  {
    question: "Je n'y connais rien en finance, je vais m'en sortir ?",
    answer:
      "Oui. Les questions sont posées simplement (« À combien tu vends une unité ? »), l'IA propose des chiffres de départ et le rapport explique les résultats en phrases simples.",
  },
  {
    question: "L'IA va-t-elle inventer mes chiffres ?",
    answer:
      "Non. L'IA propose des hypothèses que tu vérifies et corriges. Tous les résultats sont calculés par des formules fixes, et la synthèse rédigée par l'IA ne contient aucun chiffre.",
  },
  {
    question: "Combien de temps ça prend ?",
    answer: "Quelques minutes pour décrire ton idée et vérifier tes chiffres. L'aperçu s'affiche aussitôt.",
  },
  {
    question: "Comment je paie ?",
    answer:
      "1 000 FCFA, une seule fois, sur la page de paiement sécurisée de FedaPay (mobile money ou carte). Pas d'abonnement, pas de frais cachés.",
  },
  {
    question: "Et si je change de téléphone ?",
    answer:
      "Après le paiement, tu peux obtenir un code. Il te permet de rouvrir ton analyse depuis n'importe quel téléphone ou navigateur, sur la page « Retrouver mon analyse ».",
  },
  {
    question: "Je veux tester plusieurs idées.",
    answer: "Chaque idée a son aperçu gratuit. L'analyse complète coûte 1 000 FCFA par idée : tu ne paies que ce que tu approfondis.",
  },
  {
    question: "Que deviennent mes informations ?",
    answer:
      "Ta description est envoyée à un service d'IA pour te proposer des hypothèses. Tes chiffres et ton analyse restent chez nous. Ton contact n'est enregistré que si tu coches la case prévue, et il n'est jamais partagé.",
  },
  {
    question: "Si l'analyse dit que ça tient, c'est sûr que ça marchera ?",
    answer:
      "Non. C'est une aide à la décision : les résultats dépendent des chiffres que tu donnes. Elle te montre où sont les risques, pas une garantie de succès.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <h2 className="text-center text-h2-mobile font-semibold md:text-h2">Questions fréquentes</h2>
      <dl className="mt-12 flex flex-col gap-6">
        {faqs.map((faq) => (
          <div key={faq.question} className="border-b border-border pb-6">
            <dt className="text-h4 font-semibold">{faq.question}</dt>
            <dd className="mt-2 text-body text-text-secondary">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
