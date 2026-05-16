---
name: CogniVault Core
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d2027'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2ec'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e1e2ec'
  inverse-on-surface: '#2e3038'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#10131a'
  on-background: '#e1e2ec'
  surface-variant: '#32353c'
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
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  max-width: 1200px
---

## Brand & Style

The design system is engineered for a premium AI research experience, prioritizing focus, depth, and technical precision. The aesthetic is rooted in **Modern Corporate** minimalism with a distinct "Developer-Tool" edge, drawing inspiration from high-productivity platforms like Linear. 

The personality is authoritative yet assistive. To achieve this, the interface utilizes a deep, multi-layered dark mode palette that reduces eye strain during long research sessions. Visual interest is driven by "glowing" accents and light-source simulation, suggesting the "intelligence" behind the machine. The emotional response should be one of sophisticated control and effortless discovery.

## Colors

This design system utilizes a high-contrast dark palette. 
- **Primary (Electric Blue):** Reserved for primary actions, active states, and AI-driven insights. It should be used sparingly to maintain its impact.
- **Surface & Background:** The background uses a deep obsidian (#0f1117), while surfaces (#1e2433) provide clear containment for content blocks.
- **Accents:** A subtle secondary indigo is used for multi-selection or categorized AI suggestions to provide visual variety without breaking the monochromatic professional feel.
- **Functional States:** Use Success (Emerald), Warning (Amber), and Error (Rose) colors only for system feedback, ensuring they are desaturated to fit the dark environment.

## Typography

The system relies exclusively on **Inter** to project a systematic and utilitarian feel. 
- **Hierarchy:** Large display sizes use tight letter-spacing and bold weights to command attention. 
- **Readability:** Body text uses a generous line height (1.5x) to ensure research papers and long AI responses remain legible.
- **Muted Text:** Use the Slate-400 color for secondary information (body-sm and labels) to create a clear visual distance from primary content.

## Layout & Spacing

This design system follows a **Fixed-Fluid hybrid grid**. 
- **Desktop:** A 12-column grid with a max-width of 1200px, centered in the viewport. 
- **Sidebar:** A fixed-width left sidebar (240px) for navigation and research history.
- **Rhythm:** An 8px linear scale is used for all spatial relationships. 16px (md) is the standard padding for containers, while 24px (lg) is used for section vertical spacing.
- **Margins:** Large horizontal margins on desktop (64px) help focus the user's eye on the central research thread.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Inner Shadows** rather than traditional drop shadows.
- **Base Layer:** #0f1117 (Background).
- **Surface Layer:** #1e2433 (Cards/Modals). These should feature a 1px solid border (#2d3748).
- **Inner Depth:** Apply a subtle 1px white inner-border (opacity 5%) to the top edge of cards to simulate a light source from above.
- **AI Glow:** Interactive AI elements or active research nodes use a "Primary Glow"—a soft, 20px blur of the primary color at 15% opacity positioned behind the element.
- **Overlays:** Modals use a 60% black backdrop blur (8px) to isolate the user's focus.

## Shapes

The shape language is defined by **High Circularity (Pill-shaped)**.
- **Interactive Elements:** Buttons, search inputs, and chips must use full-round (pill) styling.
- **Containers:** Large cards and sections use a 1rem (16px) radius to soften the technical layout.
- **Consistency:** If an element is smaller than 32px in height, it should always be a perfect pill.

## Components

### Buttons & Inputs
- **Primary Button:** Pill-shaped, #3b82f6 background, white text. On hover, apply a 10px outer glow of the same color.
- **Search Input:** A large pill-shaped bar with a 1px border (#2d3748). When focused, the border transitions to the primary color with a subtle inner shadow.
- **Ghost Action:** Borderless with Slate-400 text, transitioning to white text on hover.

### Cards & Modules
- **Research Cards:** Surface color (#1e2433) with a subtle 1px border. No drop shadows.
- **Selected State:** A 2px primary color left-border accent and a subtle increase in background brightness.

### AI Feedback
- **Sparkle Icon:** Always paired with AI-generated content, using a gradient from #3b82f6 to #6366f1.
- **Typing Indicator:** Three pulsing dots using the primary color.

### Navigation
- **Sidebar Items:** High-contrast hover states. Active items use a small vertical pill (4px wide) on the left edge as an indicator.