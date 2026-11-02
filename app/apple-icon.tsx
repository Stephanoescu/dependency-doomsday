import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the clock mark on the brand background, full bleed (iOS rounds the corners). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#09090b" }}>
        <svg width="180" height="180" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="11" fill="#111114" stroke="#eeece6" strokeWidth="1.8" />
          <path d="M16 6.6v2.6" stroke="#ff453a" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 16 15.6 10.4" stroke="#eeece6" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M16 16 13.4 8.2" stroke="#ff453a" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16" cy="16" r="1.6" fill="#eeece6" />
        </svg>
      </div>
    ),
    size,
  );
}
