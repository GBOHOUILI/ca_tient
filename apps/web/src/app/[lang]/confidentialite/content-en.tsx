import type { ReactNode } from "react";
import { PUBLISHER } from "@/lib/site";

const CONTACT = PUBLISHER.email;

export function PrivacyEn({ Section }: { Section: (props: { title: string; children: ReactNode }) => ReactNode }) {
  return (
    <>
      <Section title="Who we are">
        <p>
          Ça tient ? is published by ZeroToOne. For any question about your information:{" "}
          <a href={`mailto:${CONTACT}`} className="text-text-primary underline underline-offset-4">
            {CONTACT}
          </a>
          .
        </p>
      </Section>

      <Section title="What we record, and why">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong className="text-text-primary">Your analysis</strong> (type of business, description, numbers, business
            model, capital): to calculate your results, let you find your analysis again, and improve Ça tient ?.
          </li>
          <li>
            <strong className="text-text-primary">Your optional answers</strong> (country, city, profile, project stage, how
            you heard about us): to understand who Ça tient ? is useful to and improve it.
          </li>
          <li>
            <strong className="text-text-primary">Your contact details</strong> (email or WhatsApp), only if you tick the box
            for it: to get back to you about Ça tient ?. They are never sold or shared.
          </li>
          <li>
            <strong className="text-text-primary">Visit statistics</strong> (pages viewed, steps of the journey), with no
            advertising cookie and without recording your IP address.
          </li>
        </ul>
      </Section>

      <Section title="The services we use">
        <p>
          Your description is sent to an artificial intelligence service (Google Gemini, with Groq or Mistral as backup) to
          suggest your assumptions, your business model and your report summary. The figures, however, are always calculated
          by our own formulas.
        </p>
        <p>
          Payment takes place on FedaPay&apos;s secure page: we never receive your mobile money number or your card, only the
          payment confirmation.
        </p>
        <p>The site and its data are hosted by Netlify, Render and Neon.</p>
      </Section>

      <Section title="Cookies and storage">
        <p>
          One cookie remembers your theme (light or dark), another your choice if you close the language suggestion. Your
          browser&apos;s storage keeps access to your analysis and where your visit came from. No advertising cookies.
        </p>
      </Section>

      <Section title="How long">
        <p>Your information is kept until you ask for it to be deleted.</p>
      </Section>

      <Section title="Deleting your information">
        <p>
          If you paid for your full analysis, you can delete it yourself with the “Delete my analysis” link at the bottom of
          your analysis. Otherwise, or for any request to access or correct your data, write to{" "}
          <a href={`mailto:${CONTACT}`} className="text-text-primary underline underline-offset-4">
            {CONTACT}
          </a>{" "}
          with the email or number you gave us, or your recovery code.
        </p>
        <p>You can also contact Benin&apos;s personal data protection authority (APDP).</p>
      </Section>
    </>
  );
}
