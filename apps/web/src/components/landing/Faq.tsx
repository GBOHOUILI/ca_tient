const faqs = [
  {
    question: "Combien de temps ça prend ?",
    answer: "Quelques minutes pour décrire ton idée et valider les hypothèses, le temps de lire ton rapport ensuite.",
  },
  {
    question: "Je n'ai pas de compétences financières, c'est un problème ?",
    answer:
      "Non. L'IA t'aide à formuler les bonnes variables, le moteur fait les calculs, le rapport explique les résultats simplement.",
  },
  {
    question: "Le paiement est-il sécurisé ?",
    answer:
      "Oui. Le paiement est vérifié côté serveur avant d'ouvrir l'accès à ton analyse, jamais sur la seule confiance de l'écran affiché.",
  },
  {
    question: "Et si je veux tester plusieurs idées ?",
    answer: "Chaque analyse coûte 1 000 FCFA, sans abonnement. Tu ne paies que pour ce que tu testes.",
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
