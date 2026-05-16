---
name: Precision Scholarly AI
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424754'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#924700'
  on-tertiary: '#ffffff'
  tertiary-container: '#b75b00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered for a high-tech AI research environment where clarity, academic rigor, and technological sophistication converge. The brand personality is "The Expert Assistant"—highly capable, unobtrusive, and impeccably organized.

The visual style follows a **Modern Corporate** approach with a heavy lean toward **Minimalism**. It prioritizes high-density information without visual clutter. The "precision" is felt through strict adherence to an 8px grid, generous whitespace to allow for deep focus, and a "Scholar-Tech" aesthetic that replaces neon-bright aesthetics with crisp, high-contrast borders and a restricted, professional palette.

## Colors
The palette is rooted in a "Paper & Steel" philosophy. 
- **Primary Blue (#3b82f6):** Reserved for high-signal actions, progress indicators, and active states. It represents the "intelligence" layer of the platform.
- **Surface Neutrals (#ffffff, #f8fafc):** Used to create a hierarchical distinction between the main canvas (white) and the structural utility areas like sidebars or secondary panels (light gray).
- **Typography Neutrals (#0f172a):** A deep slate blue-black is used for text to maintain high legibility while feeling softer and more modern than pure black.

## Typography
Inter is utilized across all levels to ensure a systematic and utilitarian feel. 
- **Headlines:** Use SemiBold (600) or Bold (700) weights with slight negative letter-spacing to create a "locked-in" professional look.
- **Body Text:** Standardizes on a 16px base for research papers and long-form data analysis to minimize eye strain.
- **Labels:** Small labels use uppercase with increased tracking (letter-spacing) to differentiate metadata from body content, mimicking the look of technical documentation.

## Layout & Spacing
The layout uses a **12-column Fixed Grid** for desktop views (max-width: 1440px) to maintain the "scholarly" feel of a centered manuscript or dashboard. 

- **Vertical Rhythm:** Built on an 8px base unit. Component heights should always be multiples of 8.
- **Desktop:** 40px outer margins with 24px gutters.
- **Tablet:** 24px outer margins with 16px gutters.
- **Mobile:** 16px outer margins.
- **Structure:** Sidebars are fixed at 280px, while the main content area remains fluid within its max-width container to accommodate dense data tables and code blocks.

## Elevation & Depth
This design system avoids heavy drop shadows in favor of **Tonal Layering** and **Low-Contrast Outlines**.

1.  **Level 0 (Base):** `#f8fafc` — The background of the application.
2.  **Level 1 (Surface):** `#ffffff` — Cards, whiteboards, and main content containers. These feature a 1px border of `#e2e8f0`.
3.  **Level 2 (Hover/Overlay):** White surfaces with an extremely subtle, diffused shadow: `0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)`.
4.  **Level 3 (Modals):** High-depth shadows to focus user attention, using a slightly tighter blur to maintain the "precision" feel.

Depth is primarily communicated through border transitions (e.g., a primary blue border on focus) rather than dramatic shifts in shadow.

## Shapes
A **Rounded** shape language (0.5rem / 8px) is applied to all standard components. This creates a balance between the "sharpness" of technical tools and the "approachability" of modern SaaS.

- **Standard Buttons/Inputs:** 8px (0.5rem)
- **Large Cards/Containers:** 16px (1rem)
- **Status Chips:** 100px (Pill) to distinguish them from interactive buttons.
- **Selection Indicators:** 4px (0.25rem) for small internal elements like checkbox markers.

## Components
- **Buttons:** Primary buttons are solid Blue (#3b82f6) with white text. Secondary buttons use a white background with a Slate-200 border. Transitions should be instant (150ms) to feel responsive and precise.
- **Inputs:** Use a white background with a 1px border of Slate-200. On focus, the border shifts to Primary Blue with a 2px outer glow (ring) of 10% opacity blue.
- **Cards:** Crisp white backgrounds, 1px Slate-200 border, and no shadow in their default state. They gain the Level 2 shadow only on hover if they are interactive.
- **Chips/Tags:** Used for AI model versions or data labels. Neutral gray background (#f1f5f9) with Slate-700 text. Small, semi-bold typography.
- **Data Tables:** Borderless rows with a subtle `#f8fafc` zebra-stripe on hover. Header cells use the `label-sm` typography style with a bottom border of 2px Slate-100.
- **Code Blocks:** Mono-spaced font (Geist Mono or JetBrains Mono) on a `#0f172a` (Deep Slate) background for maximum contrast against the light UI, signaling a "technical" zone.