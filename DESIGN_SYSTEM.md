# Collab Creative Studio - Neon Design System
**Version**: 2.0.0-neon  
**Last Updated**: October 19, 2025  
**Status**: 🔒 **LOCKED** - This is the official design system for Supernova

---

## ⚠️ IMPORTANT - Design Lock
This design system is **permanent** and **locked**. All visual styling, colors, effects, and components defined here are saved in the codebase and will persist across restarts, deployments, and updates.

**DO NOT** revert or modify this design without explicit approval.

---

## Color Palette

### Neon Colors (Primary)
- **Cyan**: `#00ffff` - Primary interactive elements, borders, icons
- **Pink**: `#ff00ff` - Secondary accents, badges, highlights  
- **Yellow**: `#ffff00` - Call-to-action buttons, warnings
- **Green**: `#00ff88` - Success states, completed items

### Background Colors
- **Background**: `#0a0a0f` - Main app background (very dark)
- **Surface**: `#121218` - Card backgrounds
- **Text**: `#ffffff` - Primary text color

### Additional Colors
- **Muted**: `#8b5cf6` - Purple for muted elements
- **Warning**: `#ffaa00` - Orange for warnings
- **Danger**: `#ff0066` - Red/pink for errors
- **Orange**: `#ff6600` - Accent color

---

## Visual Effects

### 1. Animated Grid Background
- **Type**: Dual-layer raster pattern
- **Colors**: Cyan (`rgba(0, 255, 255, 0.1)`) and Pink (`rgba(255, 0, 255, 0.05)`)
- **Animation**: Infinite scroll with 20-second duration
- **Grid Sizes**: 50px and 10px

### 2. Neon Glow Effects
All neon text has triple-layer shadows:
```css
text-shadow: 
  0 0 10px currentColor,
  0 0 20px currentColor,
  0 0 30px currentColor;
```

Available classes:
- `.neon-text-cyan`
- `.neon-text-pink`
- `.neon-text-yellow`
- `.neon-text-green`

### 3. Gradient Text
- **Class**: `.gradient-text`
- **Colors**: Cyan → Pink → Yellow
- **Animation**: 3-second infinite gradient shift

### 4. Glassmorphic Cards
- **Class**: `.neon-card`
- **Background**: `rgba(18, 18, 24, 0.8)` with backdrop blur
- **Border**: `1px solid rgba(0, 255, 255, 0.3)`
- **Glow**: Dual shadow (outer + inner)

### 5. Pulsing Animation
- **Class**: `.neon-pulse`
- **Effect**: Pulsing glow that intensifies and softens (2-second cycle)

### 6. Scanline Effect
Subtle retro CRT scanline overlay across entire app (4px repeat pattern)

---

## Typography

- **Font Family**: Inter, ui-sans-serif, system-ui
- **Font Weights**: 400 (regular), 600 (semibold), 700 (bold)
- **Line Height**: 1.5
- **Letter Spacing**: -0.02em for headings

### Colorful Headings
- H1: Gradient text with neon pulse
- H2: Gradient text
- H3: Neon cyan or pink
- Body text: White with 85% opacity for readability

---

## Components

### Buttons
- **Primary**: Cyan border + background, neon glow
- **Secondary**: Pink border + background, neon glow  
- **CTA**: Yellow border + background, neon glow
- **Success**: Green border + background, neon glow

### Cards
All cards use `.neon-card` class:
- Semi-transparent glassmorphic background
- Cyan border with glow
- Backdrop blur for depth
- Hover: Increased glow + slight translateY

### Badges
- **Cyan badges**: `rgba(0, 255, 255, 0.1)` background
- **Pink badges**: `rgba(255, 0, 255, 0.1)` background
- **Yellow badges**: `rgba(255, 255, 0, 0.1)` background

### Status Indicators
- **Draft**: Yellow (`.neon-text-yellow`)
- **Building**: Cyan (`.neon-text-cyan`)
- **Ready**: Green (`.neon-text-green`)
- **Error**: Pink (`.neon-text-pink`)

---

## File Structure

### Core Design Files (DO NOT DELETE OR MODIFY)
```
design.tokens.json                 # Source of truth for all token values
client/src/ui/tokens.css          # CSS variables and neon effects
client/src/ui/applyTokens.ts      # Runtime token application
client/src/bootstrapTokens.ts     # Auto-loads tokens on app init
```

### Styled Pages
```
client/src/pages/landing.tsx      # Neon landing page with gradient hero
client/src/pages/dashboard.tsx    # Neon project cards with colorful badges
```

---

## Usage Examples

### Neon Text
```tsx
<h1 className="gradient-text neon-pulse">AI-Powered Agents</h1>
<span className="neon-text-cyan">Building...</span>
<span className="neon-text-green">✓ Ready</span>
```

### Neon Cards
```tsx
<Card className="neon-card">
  <CardContent>Your content here</CardContent>
</Card>
```

### Neon Buttons
```tsx
<Button 
  className="neon-text-cyan font-semibold" 
  style={{ 
    background: 'rgba(0, 255, 255, 0.1)', 
    border: '2px solid var(--color-neon-cyan)' 
  }}
>
  Get Started
</Button>
```

---

## Token System

The design system uses a runtime token application system that allows live updates:

1. **Tokens** are defined in `design.tokens.json`
2. **Bootstrap** loads tokens automatically via `bootstrapTokens.ts`
3. **CSS Variables** are set dynamically via `applyTokens.ts`
4. **Live Updates** work via SSE when tokens change in `/dev` Design Mode

---

## Maintenance

### What's Protected
✅ Color palette (all neon colors)  
✅ Animated grid background  
✅ Neon glow effects and shadows  
✅ Gradient text animations  
✅ Glassmorphic card styling  
✅ Typography scale and fonts  

### What Can Be Extended
- New neon color variations (must maintain neon aesthetic)
- Additional animation effects (must use neon theme)
- New components (must follow glassmorphic + neon pattern)

---

## Version History

- **v2.0.0-neon** (Oct 19, 2025): Full neon transformation
  - Animated grid background
  - Neon glow effects across all pages
  - Gradient text with animations
  - Glassmorphic cards
  - Colorful status indicators

- **v1.0.0** (Oct 19, 2025): Initial Collab brand pack
  - Golden yellow primary
  - Navy backgrounds
  - Basic token system

---

**🔒 This design system is locked and saved permanently in the codebase.**
