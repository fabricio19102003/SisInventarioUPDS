import type { Config } from "tailwindcss";
import uiPreset from "@upds/ui/tailwind.config";

const config: Config = {
  presets: [uiPreset],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
