---
name: Luminous Intelligence
colors:
  surface: '#1a0d28'
  surface-dim: '#1a0d28'
  surface-bright: '#413350'
  surface-container-lowest: '#150822'
  surface-container-low: '#231631'
  surface-container: '#271a35'
  surface-container-high: '#322440'
  surface-container-highest: '#3d2f4b'
  on-surface: '#efdbff'
  on-surface-variant: '#cfc2d6'
  inverse-surface: '#efdbff'
  inverse-on-surface: '#382a47'
  outline: '#988d9f'
  outline-variant: '#4d4354'
  surface-tint: '#ddb7ff'
  primary: '#ddb7ff'
  on-primary: '#490080'
  primary-container: '#b76dff'
  on-primary-container: '#400071'
  inverse-primary: '#842bd2'
  secondary: '#fbabff'
  on-secondary: '#580065'
  secondary-container: '#ae05c6'
  on-secondary-container: '#ffd8fd'
  tertiary: '#adc6ff'
  on-tertiary: '#002e6a'
  tertiary-container: '#4d8eff'
  on-tertiary-container: '#00285d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f0dbff'
  primary-fixed-dim: '#ddb7ff'
  on-primary-fixed: '#2c0051'
  on-primary-fixed-variant: '#6900b3'
  secondary-fixed: '#ffd6fd'
  secondary-fixed-dim: '#fbabff'
  on-secondary-fixed: '#36003e'
  on-secondary-fixed-variant: '#7c008e'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#1a0d28'
  on-background: '#efdbff'
  surface-variant: '#3d2f4b'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  glass-padding: 20px
---

## Brand & Style

The design system is built for a cutting-edge, creative research AI environment. It prioritizes immersion and technical sophistication through a **Modern Glassmorphism** aesthetic. The interface should feel like a high-end command center—ethereal yet precise.

By leveraging deep-space backgrounds and vibrant neon accents, the system evokes a sense of infinite possibility and advanced computation. High-transparency frosted surfaces create a sense of depth, ensuring the UI feels layered and lightweight rather than monolithic. The emotional response is one of "focused wonder": the clarity of professional tools mixed with the inspiration of a creative canvas.

## Colors

The palette is anchored by a deep midnight foundation, allowing neon accents to "pop" with emissive energy.

- **Primary (Electric Violet):** Used for primary actions and active states. It should be treated as the main source of light within the UI.
- **Secondary (Magenta Pulse):** Used for highlights, decorative gradients, and signifying creative or generative AI processes.
- **Tertiary (Cyan Glow):** Reserved for technical feedback, informational signals, and secondary focus states.
- **Surface Strategy:** Backgrounds utilize the neutral #0a0118. Glass panels are created using semi-transparent whites (e.g., `rgba(255, 255, 255, 0.03)`) or primary tints with a high `backdrop-filter: blur()`.

## Typography

This design system utilizes a dual-font strategy to balance technical precision with a futuristic character. 

**Space Grotesk** is used for headlines. Its geometric quirks and wide stance reinforce the "techy" and innovative nature of the platform. **Geist** is employed for all functional text, body copy, and code-like labels; its monolinear, developer-centric construction ensures maximum readability even when placed over complex glass backgrounds or vibrant blurs. 

Contrast is key: use pure white (`#FFFFFF`) for primary headings and high-alpha greys for body text to ensure accessibility against dark, blurred backgrounds.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** model with an emphasis on "breathing room." Because glassmorphism creates visual noise through blurs, generous margins are required to prevent the UI from feeling cluttered.

- **Grid:** 12-column system for desktop, 4-column for mobile.
- **Rhythm:** An 8px base unit drives the spacing, but a 4px "half-step" is permitted for tight component internals (like icon-to-label spacing).
- **Safe Zones:** High-transparency panels should have internal padding of at least 20px to ensure content does not crowd the "glass edges."

## Elevation & Depth

Depth is not communicated through traditional drop shadows, but through **Backdrop Saturation and Blur**.

- **Level 1 (Base):** The deep midnight background.
- **Level 2 (Standard Card):** 10% opacity white fill, 20px backdrop blur, and a 1px solid border at 10% white.
- **Level 3 (Modals/Popovers):** 15% opacity white fill, 40px backdrop blur, and a 1px "glass-edge" border (top and left edges should be slightly brighter to simulate a light source).
- **Active State:** Elements in focus or active states should emit an **Outer Glow** using the Primary or Secondary color (e.g., `box-shadow: 0 0 20px rgba(168, 85, 247, 0.4)`).

## Shapes

The shape language is sophisticated and modern. 

- **Containers & Cards:** Use a consistent 1rem (`rounded-lg`) radius. This provides a soft, premium feel without becoming overly bubbly.
- **Interactive Elements:** Buttons and pill-style chips use a **Fully Rounded** (`rounded-full`) approach to differentiate them from structural panels.
- **Inputs:** Follow the container radius (1rem) to maintain a cohesive structural grid.

## Components

- **Buttons:** Primary buttons feature a subtle gradient from #a855f7 to #d946ef. They should have a 0.5px white inner border on the top edge and a vibrant outer glow on hover. Text is always bold and high-contrast.
- **Glass Cards:** These are the primary containers. They must have `backdrop-filter: blur(20px) saturate(180%)`. The border is a 1px stroke of `rgba(255, 255, 255, 0.1)`.
- **Input Fields:** Darker than the cards (5% white opacity) with a "ghost" placeholder. On focus, the border transitions to the Tertiary Cyan Glow (#3b82f6) with a matching soft outer glow.
- **Chips/Badges:** Small, fully rounded elements with semi-transparent backgrounds of the primary or tertiary colors. Use `label-sm` typography.
- **Glow Icons:** Use thin-stroke (2px) icons. Active icons should have a filter: `drop-shadow(0 0 5px currentColor)`.
- **Progress Indicators:** Use thin, neon-colored lines that appear to "pulse" or have a moving gradient highlight.