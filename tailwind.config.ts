import type {Config} from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '!./src/**/*-LAPTOP-*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        display: ['var(--font-display)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        code: ['var(--font-mono)', 'monospace'],
      },
      // Named after the curves animators actually reach for. `overshoot` is a
      // back-out: it passes its target and settles, the way a good ease-out
      // reads on screen.
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        overshoot: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'in-out-soft': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      boxShadow: {
        // Onion-skin registration: previous frame in blue, next frame in amber —
        // the same convention the Paint tool uses for its ghost frames.
        onion: '-5px 0 0 -1px rgba(79, 139, 255, 0.55), 5px 0 0 -1px rgba(255, 154, 61, 0.55), 0 18px 40px -18px rgba(139, 92, 246, 0.55)',
        'lift': '0 24px 48px -24px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        // These two were referenced in 11 places across the app but never
        // defined, so every one of those entrances silently did nothing.
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // A card arriving in a grid: rises and settles slightly past its mark.
        'card-in': {
          '0%': { opacity: '0', transform: 'translateY(18px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        // Billboard slide timer: a bar filling left to right.
        progress: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        // Ken Burns settle: an image arriving slightly large and easing in.
        'ken-burns': {
          from: { transform: 'scale(1.12) translate3d(1.5%, 1%, 0)' },
          to: { transform: 'scale(1.02) translate3d(0, 0, 0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        // Slow ambient drift for the backdrop blobs.
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(4%, -3%, 0) scale(1.06)' },
          '66%': { transform: 'translate3d(-3%, 4%, 0) scale(0.96)' },
        },
        // The bouncing ball: squash on contact, stretch on the way up.
        'ball-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1.25, 0.75)', animationTimingFunction: 'cubic-bezier(0.33, 0, 0.66, 0)' },
          '12%': { transform: 'translateY(-3px) scale(0.85, 1.2)' },
          '50%': { transform: 'translateY(-11px) scale(1, 1)', animationTimingFunction: 'cubic-bezier(0.33, 1, 0.66, 1)' },
          '88%': { transform: 'translateY(-3px) scale(0.85, 1.2)' },
        },
        'shadow-pulse': {
          '0%, 100%': { transform: 'scaleX(1.2)', opacity: '0.55' },
          '50%': { transform: 'scaleX(0.6)', opacity: '0.2' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in-up': 'fade-in-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'card-in': 'card-in 0.55s cubic-bezier(0.34, 1.3, 0.64, 1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        drift: 'drift 26s ease-in-out infinite',
        'ball-bounce': 'ball-bounce 0.9s infinite',
        'shadow-pulse': 'shadow-pulse 0.9s infinite',
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;
