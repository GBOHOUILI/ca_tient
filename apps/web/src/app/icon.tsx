import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          background: "linear-gradient(135deg, #008558, #0fa890)",
          color: "#ffffff",
          fontSize: 40,
          fontWeight: 700,
        }}
      >
        Ç
      </div>
    ),
    size,
  );
}
