import { presetWind4 } from '@unocss/preset-wind4';
import {
	defineConfig,
	presetIcons,
	presetAttributify,
	presetTagify,
	transformerDirectives,
	transformerVariantGroup,
} from 'unocss';
import { presetAnimations } from 'unocss-preset-animations';
import extractorSvelte from '@unocss/extractor-svelte';
import { presetShadcn } from 'unocss-preset-shadcn';

export default defineConfig({
	presets: [
		presetWind4() as any,
		presetAnimations() as any,
		presetShadcn({
			color: 'slate',
			radius: 0.5,
		}) as any,
		presetIcons({
			prefix: 'i-',
			scale: 1.2,
			extraProperties: {
				display: 'inline-block',
				'vertical-align': 'middle',
			},
			collections: {
				lucide: () => import('@iconify-json/lucide/icons.json').then((i) => i.default as any),
			},
		}),
		presetAttributify(),
		presetTagify(),
	],

	transformers: [
		transformerDirectives({
			enforce: 'pre',
		}),
		transformerVariantGroup(),
	],
	extractors: [extractorSvelte()],

	shortcuts: [
		{
			// Brand & UI Shortcuts
			'brand-gradient': 'bg-gradient-to-r from-primary to-secondary',
			'glass-card': 'bg-card/80 backdrop-blur-md border border-border/50 shadow-glass',
			
			// Animation shortcuts
			'animate-fade-in-up': 'animate-fade-in-up-run',
			'animate-bounce-slow': 'animate-bounce-slow-run',
			'animate-shimmer-slide': 'animate-shimmer-slide-run',
			'animate-in': 'animate-fade-in animate-duration-200 animate-ease-out',
			'animate-out': 'animate-fade-out animate-duration-200 animate-ease-in',
		},
	],

	theme: {
		fontFamily: {
			sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
			display: 'Outfit, Inter, sans-serif',
			mono: 'JetBrains Mono, monospace',
		},
		colors: {
			background: 'var(--background)',
			foreground: 'var(--foreground)',
			card: 'var(--card)',
			'card-foreground': 'var(--card-foreground)',
			popover: 'var(--popover)',
			'popover-foreground': 'var(--popover-foreground)',
			primary: 'var(--primary)',
			'primary-foreground': 'var(--primary-foreground)',
			secondary: 'var(--secondary)',
			'secondary-foreground': 'var(--secondary-foreground)',
			muted: 'var(--muted)',
			'muted-foreground': 'var(--muted-foreground)',
			accent: 'var(--accent)',
			'accent-foreground': 'var(--accent-foreground)',
			destructive: 'var(--destructive)',
			'destructive-foreground': 'var(--destructive-foreground)',
			border: 'var(--border)',
			input: 'var(--input)',
			ring: 'var(--ring)',
			sidebar: 'var(--sidebar)',
			'sidebar-foreground': 'var(--sidebar-foreground)',
			'sidebar-primary': 'var(--sidebar-primary)',
			'sidebar-primary-foreground': 'var(--sidebar-primary-foreground)',
			'sidebar-accent': 'var(--sidebar-accent)',
			'sidebar-accent-foreground': 'var(--sidebar-accent-foreground)',
			'sidebar-border': 'var(--sidebar-border)',
			'sidebar-ring': 'var(--sidebar-ring)',
		},
		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)',
		},
		// Tailwind v4 parity screens if needed
		screens: {
			xs: '480px',
			sm: '640px',
			md: '768px',
			lg: '1024px',
			xl: '1280px',
			'2xl': '1536px',
		},
	},

	content: {
		pipeline: {
			include: [
				/\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html|css|scss)($|\?)/,
			],
		},
	},
});
