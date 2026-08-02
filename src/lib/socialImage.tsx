import { ImageResponse } from "next/og";

export const SOCIAL_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

export const SOCIAL_IMAGE_ALT = "SNHU Degree Map — unofficial interactive degree requirements";

export function createDegreeMapSocialImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #fbf9f8 0%, #dbe1ff 55%, #f0eded 100%)",
          padding: "64px 72px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#001d59",
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: -1.5,
              lineHeight: 1.05,
            }}
          >
            SNHU Degree Map
          </div>
          <div
            style={{
              display: "flex",
              color: "#003087",
              fontSize: 34,
              fontWeight: 500,
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            Interactive degree requirements and prerequisite maps
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#444652",
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            Unofficial project
          </div>
          <div
            style={{
              display: "flex",
              width: 160,
              height: 10,
              borderRadius: 999,
              background: "#001d59",
            }}
          />
        </div>
      </div>
    ),
    {
      ...SOCIAL_IMAGE_SIZE,
    },
  );
}
