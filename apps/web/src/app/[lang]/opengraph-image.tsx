import { ImageResponse } from "next/og";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { hasLocale } from "@/i18n/locales";

// Social preview (WhatsApp, Facebook, LinkedIn...). No price on it: the price is configurable.
// The alt text is static for both languages: the image itself carries the translated words.
export const alt = "Ça tient ?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = DICTIONARIES[hasLocale(lang) ? lang : "fr"].meta;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0b",
          color: "#fafafa",
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 700, color: "#22e5c9" }}>Ça tient ?</div>
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", fontSize: 72, lineHeight: 1.15 }}>
          <span>{t.ogHeadline[0]}</span>
          <span>{t.ogHeadline[1]}</span>
        </div>
        <div style={{ marginTop: 32, fontSize: 34, color: "#a1a1aa" }}>
          {t.ogSubline}
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignSelf: "flex-start",
            padding: "16px 32px",
            borderRadius: 16,
            fontSize: 32,
            fontWeight: 600,
            background: "linear-gradient(90deg, #008558, #22e5c9)",
          }}
        >
          {t.ogBadge}
        </div>
      </div>
    ),
    size,
  );
}
