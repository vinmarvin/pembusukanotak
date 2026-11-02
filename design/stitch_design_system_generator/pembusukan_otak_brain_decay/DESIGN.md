---
name: Pembusukan Otak (Brain Decay)
colors:
  surface: '#1a0b2e'
  surface-dim: '#1a0b2e'
  surface-bright: '#413257'
  surface-container-lowest: '#150629'
  surface-container-low: '#231437'
  surface-container: '#27183b'
  surface-container-high: '#322346'
  surface-container-highest: '#3d2e52'
  on-surface: '#eddcff'
  on-surface-variant: '#b9ccb5'
  inverse-surface: '#eddcff'
  inverse-on-surface: '#38294d'
  outline: '#849581'
  outline-variant: '#3b4b3a'
  surface-tint: '#00e55b'
  primary: '#edffe8'
  on-primary: '#003911'
  primary-container: '#00ff66'
  on-primary-container: '#007128'
  inverse-primary: '#006e27'
  secondary: '#ffb1c4'
  on-secondary: '#65002e'
  secondary-container: '#ff4a8d'
  on-secondary-container: '#590028'
  tertiary: '#fff9ee'
  on-tertiary: '#373100'
  tertiary-container: '#f7df00'
  on-tertiary-container: '#6d6200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6bff83'
  primary-fixed-dim: '#00e55b'
  on-primary-fixed: '#002107'
  on-primary-fixed-variant: '#00531b'
  secondary-fixed: '#ffd9e1'
  secondary-fixed-dim: '#ffb1c4'
  on-secondary-fixed: '#3f001a'
  on-secondary-fixed-variant: '#8f0044'
  tertiary-fixed: '#fde400'
  tertiary-fixed-dim: '#dec800'
  on-tertiary-fixed: '#201c00'
  on-tertiary-fixed-variant: '#504700'
  background: '#1a0b2e'
  on-background: '#eddcff'
  surface-variant: '#3d2e52'
  brain-surface: '#2D124D'
  brain-membrane-tray: '#1E0A33'
  electric-cyan: '#00E5FF'
  ink-contour: '#0B0410'
  hard-shadow: '#060208'
  parchment-light: '#FFF7E6'
  lore-ink: '#2B1A3D'
typography:
  hero-title:
    fontFamily: Titan One
    fontSize: 88px
    fontWeight: '400'
    lineHeight: 96px
    letterSpacing: 2px
  hero-title-mobile:
    fontFamily: Titan One
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 54px
    letterSpacing: 1px
  modal-title:
    fontFamily: Titan One
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
    letterSpacing: 1px
  hud-counter:
    fontFamily: Russo One
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: 0px
  button-arcade:
    fontFamily: Russo One
    fontSize: 26px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 1px
  label-tag:
    fontFamily: Russo One
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.5px
  lore-h1:
    fontFamily: Titan One
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 34px
    letterSpacing: 0.5px
  lore-body:
    fontFamily: Quicksand
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: 0px
  lore-caption:
    fontFamily: Quicksand
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-grid: 0.25rem
  margin: 2rem
  margin-compact: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

### Personality & Emotional Response
The design system manifests a hyper-stimulating, satirical, and frantic neo-arcade aesthetic. It balances biological body-horror parody with mid-2000s cartoon bravado and modern short-form algorithm saturation. The UI evokes intense urgency, tactile punchiness, and immediate dopamine gratification. Surfaces feel visceral yet clean, tactile yet punch-drunk on internet excess.

### Visual Style Movement: Neo-Arcade Comic Cel
The design system fuses **High-Contrast Comic Inking** with **Flat Cel Pop Art** and tactile arcade physicalism:
- **Heavy Inked Contours:** Unyielding 3px to 5px solid black borders maintain razor-sharp silhouettes amidst hyper-saturated colors.
- **Two-Tone Cel Shading & Gloss Arcs:** Foreground elements employ strict two-tone color blocks paired with crescent-shaped glossy specular highlights.
- **Directional Extruded Drop Shadows:** No diffuse Gaussian blur is permitted. All tactile elevation is rendered via hard 45° offset drop shadows with zero radius blur, mimicking thick plastic arcade switches, physical acrylic charms, and die-cut vinyl stickers.
- **Organic vs. Digital Contrast:** Gooey, deep-violet anatomical cerebral canvas layers support flat, rigid, neon-bordered interactive panels.

## Colors

### Color Hierarchy & Roles
- **Primary (`#00FF66` / Slime Green):** Player status authority, vital HP gauges, positive feedback, combo extensions (`+5s`), primary affirmative arcade triggers.
- **Secondary (`#FF007F` / Punch Magenta):** Hostile elements, boss danger tiers, countdown critical alerts, time drain penalties (`-10s`), urgent interactive stops.
- **Tertiary (`#FFE600` / Arcade Yellow):** Combat timers, active scores, multiplier badges, trophy highlights, and crisp visual contour accents.
- **Neutral Canvas (`#1A0B2E` / Neural Violet):** The base negative canvas, representing deep brain-stem biology and background void.

### Specialized Surfaces & Semantic Accents
- `brain-surface` (`#2D124D`): Raised modal backdrops, dialog decks, and elevated panel plates.
- `brain-membrane-tray` (`#1E0A33`): Sunken 8x7 Match-3 playfield backing trays.
- `electric-cyan` (`#00E5FF`): Time freeze states, power-up conduits, line-breaker energy, and special ability charges.
- `ink-contour` (`#0B0410`): The universal structural ink boundary applied to every interactive component and glyph.
- `hard-shadow` (`#060208`): Directional isometric offset shadow for tactile elevation.
- `parchment-light` (`#FFF7E6`) & `lore-ink` (`#2B1A3D`): Scrapbook dossier textures for Meme Books and research profiles.

## Typography

### Structural Hierarchy
- **Display & Headings (Titan One):** Ultra-fat, cartoonish letterforms built for heavy contour rendering. Used for stage splash banners, victory announcements, modal headers, and comic impact words.
- **HUD & Data Counters (Russo One):** Blocky, condensed arcade typography built to stabilize high-frequency digit rollouts (scores, countdown fractions, damage splatters, button prompts).
- **Narrative & Lore (Quicksand Bold):** Geometric, warm sans-serif with rounded terminals ensuring maximum readability against light parchment or dossier cards.

### Text Inking & Outlining Rules
- `hero-title`: 6px outer stroke `#0B0410` + 8px hard offset `#060208`.
- `modal-title`: 4px outer stroke `#0B0410` + 5px hard offset `#060208`.
- `hud-counter` & `button-arcade`: 3px outer stroke `#0B0410` + 3px hard offset `#060208`.
- `lore-body`: Unstroked on high-contrast parchment; requires a 2px `#0B0410` stroke when positioned over gameplay overlays.

## Layout & Spacing

### 16:9 Landscape Foundation
The core interface target is a fixed-ratio 16:9 landscape baseline (1920x1080), adapting responsively to landscape tablets and mobile screens:
- **Canvas Margins:** Fixed `margin` (2rem / 32px) safe zones on left/right edges to avoid device cutouts.
- **Top HUD Deck (Top 20%):** Houses the split Player Status (left) and Boss Status (right) decks with the center-anchored Attack Countdown Bar.
- **Arena Stage (Bottom 80%):** Features the centered 8x7 Match-3 sunken grid container with tight 4px (`gutter-grid`) cell spacing to prevent visual noise during tile swaps.
- **Modal Viewports:** Standardized 9-slice frames centered with maximum dimension caps of 1440x860 on desktop/web and dynamic 90vw on compact landscape displays.

## Elevation & Depth

### Physical Sticker Elevation
This design system avoids soft Gaussian blurs. Visual hierarchy is achieved strictly through dimensional layers, comic ink strokes, and solid offset shadow plates:

- **Layer 0 (Canvas):** Flat `#1A0B2E` with organic neural tissue texture overlays.
- **Layer 1 (Recessed Playfield Tray):** Inset bevel effect using a 4px interior border of `#0B0410` and solid `#1E0A33` floor.
- **Layer 2 (Raised Modals & Decks):** `#2D124D` surface framed by a 4px solid `#0B0410` border and a directional offset shadow (`X: 0px, Y: 8px, color: #060208`).
- **Layer 3 (Arcade Action Buttons & Tiles):** Vibrant color fills (`#00FF66`, `#FF007F`, `#FFE600`) wrapped in a 3px–4px ink stroke, elevated by a hard offset (`X: 0px, Y: 6px, color: #060208`).
- **Layer 4 (Floating Scores & VFX):** Bright floating popups with a 4px stroke and `X: 0px, Y: 4px` shadow, overlapping all playfield grids.

### Active State Transformations
Interactive elements convey depth changes physically: on tap/click (`:active`), buttons shift down (`translateY(4px)`) while their offset shadow drops from `Y: 6px` to `Y: 2px`, creating a tangible mechanical tactile switch response.

## Shapes

### Shape Grammar & Corner Curves
- **Overall Curvature:** Mode 2 (Rounded) with 0.5rem base radius, 1rem for standard components, and 1.5rem for large structural containers.
- **Containers & Plates:** Large modal plates and Match-3 grid frames use `rounded-xl` (1.5rem / 24px) combined with thick exterior ink lines to soften brutalist boxiness into an organic comic panel feel.
- **Buttons & Gauges:** Interactive buttons, HP rail caps, and badge tags utilize `rounded-lg` (1rem / 16px).
- **Match-3 Candy Tiles:** Chamfered squircle geometry (16px radius) preserving circular visual safe zones (220px inner core diameter within a 256px tile frame).

## Components

### Arcade Action Buttons
- **Geometry:** Height 64px, `rounded-lg` (16px), 4px border `#0B0410`.
- **Fill:** Primary Slime Green (`#00FF66`), Punch Magenta (`#FF007F`), or Arcade Yellow (`#FFE600`).
- **Cel Highlight:** An arched white specular highlight layer (`rgba(255, 255, 255, 0.35)`) running across the top half.
- **Shadow:** Hard offset `0px 6px 0px #060208`.
- **States:** Hover scales to `1.03x`; Active translates `translateY(4px)` with shadow reduced to `0px 2px 0px #060208`.

### 9-Slice Status Gauges (HP & Countdown Bars)
- **Container Track:** 40px height, background `#0B0410`, inner inset track `#1A0B2E`.
- **Progress Fill:**
  - Player HP: Saturated `#00FF66` with diagonal cartoon shine striping.
  - Enemy HP: `#FF007F` with jagged dynamic damage ticks.
  - Attack Timer: High-contrast `#FFE600`, flashing `#FF007F` under 3.0s accompanied by alert particles.
- **Border:** 3px exterior stroke `#0B0410` with hard shadow `0px 4px 0px #060208`.

### Match-3 Grid Tray & Candy Tiles
- **Grid Tray:** Deep recessed plate `#1E0A33` with 4px border `#0B0410`.
- **Tiles:** 256x256px canvas with 220px diameter safe zones, centered pivots.
- **Power-Up Overlays:**
  - Line-Breaker: Dual flashing cyan arrows (`#00E5FF`).
  - Time Freeze: Sharp corner ice crystals encroaching inward.
  - Multiplier: Offset golden coin stamp badge at top-right.

### Meme Books Dossier Cards (Encyclopedia)
- **Metaphor:** Open scrapbook with a split two-page layout.
- **Left Page (Polaroid Snapshot):** `#FFFFFF` bordered card tilted at `-3deg` with comic paperclip accent; center cutout displaying viral pathogen art with a stamped rubber badge (`COLLECTED` or `LOCKED`).
- **Right Page (Dossier Sheet):** Yellowed paper texture (`#FFF7E6`), light-ruled notebook lines, typography set in `lore-ink` (`#2B1A3D`), detailing humorous attention-span diagnostic reports.

### Achievement Cards
- **Structure:** Horizontal scroll cards set in parchment frames with neon vine borders (`#00FF66` & `#00E5FF`).
- **Emblem:** Circular 64px golden badge with comic ink outlines on the left, Russo One milestone counter and dynamic progress bar on the right.