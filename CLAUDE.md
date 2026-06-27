# Pasha New — Claude Code Instructions

## Project Overview
Modern, animated, and interactive UI/UX project. Always produce premium, visually impressive output suitable for client presentation.

---

## Stack
- **Framework**: React (functional components + hooks) or Next.js
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion (transitions, reveals, stagger) + GSAP (scroll-based, timelines)
- **Icons**: Lucide React

---

## Design Aesthetic
- Always use colors, typography, and spacing defined in the project theme (Tailwind config, CSS variables, or design tokens) — never override with hardcoded values
- Glassmorphism cards: `backdrop-blur`, semi-transparent borders, subtle opacity layers using theme colors
- Gradient text on headings using theme accent colors
- Minimal, premium, high-end feel — never generic or template-looking
- Micro-interactions on every hover, focus, and click state
- Smooth scroll reveals and page transitions throughout

---

## Animation Rules
- Animate ALL section entrances with Framer Motion (`fadeUp`, `staggerChildren`)
- Use GSAP `ScrollTrigger` for parallax and pinned scroll effects
- Buttons: `scale` + `glow` on hover
- Cards: `lift` + `border glow` on hover
- Never produce static, unanimated layouts unless explicitly asked

---

## Typography
- Headings: bold, large, generous `letter-spacing`
- Use theme-defined font colors — never hardcode text colors
- Body: clean, readable, slightly muted using theme's muted/secondary color token

---

## Code Rules
- Single file components unless told otherwise
- Clean, commented, production-ready code
- Mobile responsive by default — always
- No placeholder lorem ipsum — use realistic, meaningful content
- Export default component with no required props
- Always make it visually impressive — output is shown to clients

---

## Folder Structure (preferred)
```
/app or /pages       → Next.js routes
/components          → Reusable UI components
/sections            → Page sections (Hero, About, Features, etc.)
/lib                 → Utilities and helpers
/public              → Static assets
CLAUDE.md            → This file
```

---

## Output Format
- React: `export default function ComponentName()`
- HTML: single file with embedded CSS and JS
- Always include Framer Motion `AnimatePresence` for route/modal transitions

---

## Notes
- Match design aesthetic to project context if briefed
- When in doubt, go darker, more minimal, more animated
- Client-ready output always — no rough drafts
