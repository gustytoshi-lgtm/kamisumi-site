import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

// サイト既定の OGP 画像（1200x630 PNG）を動的生成する。
// SVG はSNSで描画されないため、ImageResponse でPNGを返す。
// フォント読込を避けるため、描画テキストはラテン文字のみに限定する。
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "80px",
          background: "#44513b",
          color: "#f6f2e9",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: "#a58a55" }}>
          {siteConfig.brand.subline}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 700, letterSpacing: 6 }}>
            {siteConfig.brand.name}
          </div>
          <div style={{ display: "flex", fontSize: 42, color: "#ece5d8", marginTop: 12 }}>
            {siteConfig.brand.tagline.en}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#d3ccbf" }}>
          {siteConfig.organization.name}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
