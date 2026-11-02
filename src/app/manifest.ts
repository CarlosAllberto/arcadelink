import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ArcadeLink",
    short_name: "ArcadeLink",
    start_url: "/",
    display: "standalone",
    background_color: "#17181c",
    theme_color: "#17181c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
