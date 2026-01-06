import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    const title = "Fit Tracker";
    const short_name = "Fit Tracker";
    const description = "Tracker vos forme est un jeu d'enfant";

    return {
        name: title,
        short_name: short_name,
        description: description,
        theme_color: "#34D399",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "natural",
        scope: "/",
        start_url: "/",
        icons: [
            {
                src: "/web-app-manifest-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/web-app-manifest-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
        id: title,
        categories: ["utilities"],
        dir: "ltr",
        lang: "fr",
        display_override: ["standalone", "minimal-ui", "fullscreen", "window-controls-overlay", "browser"],
        launch_handler: {
            client_mode: "navigate-new",
        },
        shortcuts: [
            {
                name: "Accueil",
                url: "/",
            },
            {
                name: "Steps",
                url: "/steps",
            },
            {
                name: "Calories",
                url: "/calories",
            },
            {
                name: "Profil",
                url: "/profile",
            },
        ],
    };
}
