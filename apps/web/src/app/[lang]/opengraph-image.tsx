import { ImageResponse } from "next/og";

// Social preview (WhatsApp, Facebook, LinkedIn...). No price on it: the price is configurable.
export const alt = "Ça tient ? — Teste ton idée de business avant d'investir";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          <span>Ton idée de business</span>
          <span>tient-elle vraiment ?</span>
        </div>
        <div style={{ marginTop: 32, fontSize: 34, color: "#a1a1aa" }}>
          Chiffre d&apos;affaires, marge, seuil de rentabilité, en quelques minutes.
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
          Aperçu gratuit
        </div>
      </div>
    ),
    size,
  );
}
