import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "hsl(222, 47%, 11%)",
                foreground: "hsl(213, 31%, 75%)", // Сделали темнее (было 91%)
                primary: {
                    DEFAULT: "hsl(217, 91%, 60%)",
                    foreground: "hsl(0, 0%, 100%)",
                },
                secondary: {
                    DEFAULT: "hsl(222, 47%, 15%)",
                    foreground: "hsl(213, 31%, 75%)", // Сделали темнее (было 91%)
                },
                accent: {
                    DEFAULT: "hsl(142, 71%, 45%)",
                    foreground: "hsl(0, 0%, 100%)",
                },
                muted: {
                    DEFAULT: "hsl(223, 47%, 18%)",
                    foreground: "hsl(215, 20%, 55%)", // Сделали темнее (было 65%)
                },
                border: "hsl(223, 47%, 20%)",
            },
            fontFamily: {
                sans: ["var(--font-inter)", "system-ui", "sans-serif"],
            },
            animation: {
                "fade-in": "fadeIn 0.3s ease-in",
                "slide-up": "slideUp 0.4s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { transform: "translateY(10px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
