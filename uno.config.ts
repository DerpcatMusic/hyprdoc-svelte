import extractorSvelte from "@unocss/extractor-svelte";
import { presetWind4 } from "@unocss/preset-wind4";
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTagify,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";
import { presetAnimations } from "unocss-preset-animations";
import { presetShadcn } from "unocss-preset-shadcn";
import { presetHyprdoc } from "./src/lib/styles/preset-hyprdoc";

export default defineConfig({
  content: {
    filesystem: [
      'src/**/*.{html,js,ts,jsx,tsx,vue,svelte,astro,marko}',
    ],
    pipeline: {
      include: [
        /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html|css|scss)($|\?)/,
      ],
    },
  },
  presets: [
    presetWind4(),
    presetAnimations(),
    presetShadcn({
      color: "slate",
      radius: 0.75,
    }),
    presetIcons({
      prefix: "i-",
      scale: 1.2,
      extraProperties: {
        display: "inline-block",
        "vertical-align": "middle",
      },
      collections: {
        lucide: () =>
          import("@iconify-json/lucide/icons.json").then(
            (i) => i.default as any
          ),
      },
    }),
    presetAttributify(),
    presetTagify(),
    // Custom Preset (Last to override)
    presetHyprdoc() as any,
  ],

  transformers: [
    transformerDirectives({
      enforce: "pre",
    }),
    transformerVariantGroup(),
  ],
  extractors: [extractorSvelte()],
});
