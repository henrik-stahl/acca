import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const isStaging = process.env.NEXT_PUBLIC_ENVIRONMENT === "staging";
  const bg = isStaging ? "#d97706" : "#1a1f5e";

  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Triangle "A" shape */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <polygon points="11,2 21,20 1,20" fill="white" />
          <rect x="6" y="15" width="10" height="2.5" fill={bg} />
        </svg>
      </div>
    ),
    { ...size }
  );
}
