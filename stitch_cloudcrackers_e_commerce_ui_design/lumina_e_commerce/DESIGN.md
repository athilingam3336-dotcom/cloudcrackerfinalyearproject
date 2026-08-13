---
name: Lumina E-Commerce
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#5b403f'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#8f6f6e'
  outline-variant: '#e4bebc'
  surface-tint: '#bb152c'
  primary: '#b7102a'
  on-primary: '#ffffff'
  primary-container: '#db313f'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb3b1'
  secondary: '#825500'
  on-secondary: '#ffffff'
  secondary-container: '#ffae1d'
  on-secondary-container: '#6b4500'
  tertiary: '#5b5c60'
  on-tertiary: '#ffffff'
  tertiary-container: '#747479'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b1'
  on-primary-fixed: '#410007'
  on-primary-fixed-variant: '#92001c'
  secondary-fixed: '#ffddb3'
  secondary-fixed-dim: '#ffb950'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#624000'
  tertiary-fixed: '#e3e2e7'
  tertiary-fixed-dim: '#c7c6cb'
  on-tertiary-fixed: '#1a1b1f'
  on-tertiary-fixed-variant: '#46464b'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 57px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
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
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 64px
---

## Brand & Style

The design system is engineered for a premium e-commerce experience that balances the excitement of pyrotechnics with the reliability of a high-end retail platform. The brand personality is **energetic, professional, and accessible**. 

Drawing heavily from **Modern Minimalism** and **Material Design 3**, the UI utilizes vast amounts of white space to let product imagery take center stage. The aesthetic is punctuated by high-vibrancy accents that mimic the flash of fireworks against a night sky. The emotional response should be one of "safe excitement"—where the user feels the thrill of the purchase within a structured, trustworthy environment. High-quality motion and soft, tactile surfaces replace traditional "loud" e-commerce patterns to maintain a premium feel.

## Colors

The palette is inspired by the ignition and glow of a firework display. 

- **Primary (Vibrant Red):** Used for critical actions, price points, and branding moments. It represents the "spark."
- **Secondary (Energetic Orange):** Used for highlighting features, badges, and secondary "Add to Cart" interactions.
- **Tertiary (Deep Dark Gray):** Provides the structural "night sky" contrast. Used for primary text, deep-layer backgrounds, and navigation bars.
- **Neutral/Surface:** A mix of Pure White and very light grays to ensure the interface feels airy and organized.

Functional colors (Success, Warning, Error) should follow standard semantic patterns but utilize the rounded, soft visual language of the system.

## Typography

This design system utilizes **Inter** for its exceptional legibility and systematic feel. The type hierarchy is strictly defined to ensure a clear information architecture in a dense e-commerce environment.

- **Headlines:** Use a tighter letter-spacing and heavier weights to create a sense of importance and "premium" density.
- **Body:** Standardized at 16px for primary descriptions to ensure accessibility.
- **Labels:** Small, uppercase labels with increased letter-spacing are used for categories and overlines to provide a technical, "catalog" feel.
- **Scaling:** On mobile devices, Display and Headline sizes scale down by approximately 15% to prevent awkward text wrapping on product titles.

## Layout & Spacing

The layout follows a **8px baseline grid** to ensure mathematical harmony across all components.

- **Grid:** A 12-column fluid grid for desktop and a 4-column grid for mobile.
- **Margins:** Generous 20px margins on mobile to avoid content touching the edge of the glass, expanding to 64px on desktop for a "boutique" feel.
- **Rhythm:** Use `md` (24px) for most vertical spacing between sections to maintain a clean, breathable flow. Product grids should utilize a 16px gutter to maximize image real estate while maintaining separation.

## Elevation & Depth

In alignment with Material 3, depth is communicated through **Tonal Layers** and **Ambient Shadows**.

1.  **Level 0 (Base):** Pure White (#FFFFFF) surface.
2.  **Level 1 (Cards/Inputs):** Soft, extra-diffused shadow (Blur: 15px, Y: 4px, Opacity: 6% Black) with a 1px neutral stroke.
3.  **Level 2 (Dropdowns/Modals):** High-diffusion shadow (Blur: 30px, Y: 10px, Opacity: 10% Black) to create a clear "floating" effect.

Surfaces should feel "soft" rather than "flat." Use subtle background tints (Neutral #F8F9FA) to differentiate section backgrounds from foreground cards.

## Shapes

The design system uses **Rounded** geometry to evoke a friendly and modern personality. 

- **Components:** Standard buttons and input fields use a 0.5rem (8px) radius.
- **Containers:** Large product cards and promotional banners use `rounded-xl` (1.5rem / 24px) to create a distinct, high-end "container" look that softens the overall UI.
- **Selection:** Indicators like radio buttons or small chips should use "Pill" shapes to contrast against the more structural card shapes.

## Components

### Buttons
- **Primary:** Solid #E63946 with white text. High-contrast, 0.5rem rounded corners. On hover, darken slightly.
- **Secondary:** Outlined with #1D1E22. 1.5px border weight.
- **Tertiary:** Text-only, bold weight, used for "See All" or "View Details."

### Input Fields
- **Search:** Large, pill-shaped input with a 1px light gray border. Use the secondary color (#F1A208) for the focus ring.
- **Forms:** Standard 8px radius with a subtle #F8F9FA background fill to indicate interactivity.

### Cards
- **Product Cards:** Elevated Level 1 shadow. Image at the top with a subtle 0.5px internal border to prevent white images from bleeding into the card background. Product titles in `title-lg` and prices in the Primary Red.

### Chips & Badges
- **Status Badges:** "New" or "Sale" badges use the Secondary Orange with white text. 
- **Categories:** Pill-shaped, light neutral background with dark text for filter states.

### Lists
- Clean, borderless list items with 16px padding and a subtle divider line (#E9ECEF) that does not span the full width of the container.