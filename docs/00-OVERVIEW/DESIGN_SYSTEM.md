# OurVidz Design System

> **North Star Reference** - This document defines the visual design standards for the OurVidz platform. All components and pages should adhere to these specifications.

## Design Principles

1. **Compact & Dense** - Maximize information density without sacrificing usability. Users should see more content with less scrolling.

2. **Dark-First** - Optimized for dark environments and extended viewing sessions. Reduces eye strain for content creators working long hours.

3. **Consistent Spacing** - 4px base unit. All spacing uses multiples of 4 (4, 8, 12, 16, 24, 32px).

4. **Subtle Hierarchy** - Use opacity, weight, and subtle size differences for emphasis rather than dramatic size changes.

5. **Performance-Conscious** - Minimal animations, efficient rendering. UI should feel snappy and responsive.

---

## Typography Scale

Using Inter font family throughout.

| Name | Size | Weight | Line Height | Tailwind Class | Use Case |
|------|------|--------|-------------|----------------|----------|
| Display | 18px | 600 | 1.2 | `text-lg font-semibold` | Page titles only |
| Heading | 14px | 600 | 1.3 | `text-sm font-semibold` | Section headers |
| Body | 12px | 400 | 1.5 | `text-xs` | Body text, descriptions |
| Label | 11px | 500 | 1.4 | `text-[11px] font-medium` | Form labels |
| Caption | 10px | 400 | 1.4 | `text-[10px]` | Helper text, timestamps |
| Micro | 9px | 400 | 1.3 | `text-[9px]` | Badges, chips, status indicators |

### Typography Best Practices

- Never use font sizes below 9px (accessibility concern)
- Use `font-medium` (500) for labels, `font-semibold` (600) for headers
- Prefer opacity (`text-muted-foreground`) over gray colors for secondary text
- Line height should be tighter for headings (1.2-1.3), looser for body (1.5)

---

## Spacing Scale

Based on 4px unit system.

| Token | Value | Tailwind | Use Case |
|-------|-------|----------|----------|
| xs | 4px | `gap-1`, `p-1` | Tight spacing, icon margins |
| sm | 8px | `gap-2`, `p-2` | Component internal spacing |
| md | 12px | `gap-3`, `p-3` | Section padding |
| lg | 16px | `gap-4`, `p-4` | Card padding, section gaps |
| xl | 24px | `gap-6`, `p-6` | Major section separation |
| 2xl | 32px | `gap-8`, `p-8` | Page-level spacing |

### Spacing Best Practices

- Use consistent spacing within component types
- Tighter spacing (4-8px) for dense UI like forms and controls
- Larger spacing (16-24px) for content sections and cards

---

## Component Sizes

### Buttons

| Size | Height | Padding | Font Size | Icon Size | Tailwind |
|------|--------|---------|-----------|-----------|----------|
| xs | 24px | px-2 | 10px | 12px | `h-6 px-2 text-[10px]` |
| sm | 28px | px-2.5 | 11px | 12px | `h-7 px-2.5 text-[11px]` |
| default | 32px | px-3 | 12px | 14px | `h-8 px-3 text-xs` |
| lg | 36px | px-4 | 14px | 16px | `h-9 px-4 text-sm` |
| icon | 32px | - | - | 14px | `h-8 w-8` |
| icon-sm | 24px | - | - | 12px | `h-6 w-6` |

### Inputs

| Type | Height | Padding | Font Size | Tailwind |
|------|--------|---------|-----------|----------|
| Input | 32px | px-2.5 | 12px | `h-8 px-2.5 text-xs` |
| Textarea | auto | p-2.5 | 12px | `text-xs p-2.5` |
| Select | 32px | px-2.5 | 12px | `h-8 px-2.5 text-xs` |

### Other Components

| Component | Height | Notes |
|-----------|--------|-------|
| Tabs | 32px | `h-8` for TabsList |
| Tab Trigger | 28px | `h-7` with `text-[11px]` |
| Badge | 20px | `h-5` with `text-[10px]` |
| Chip | 24px | `h-6` with `text-[10px]` |
| Avatar (sm) | 32px | `h-8 w-8` |
| Avatar (md) | 40px | `h-10 w-10` |
| Avatar (lg) | 48px | `h-12 w-12` |

---

## Color Palette

### Dark Theme (Primary)

```css
--background: 220 13% 9%;        /* #14161a - Page background */
--foreground: 0 0% 95%;          /* #f2f2f2 - Primary text */
--card: 220 13% 11%;             /* #191c21 - Card backgrounds */
--card-foreground: 0 0% 95%;     /* #f2f2f2 - Card text */
--muted: 220 13% 14%;            /* #1f232a - Muted backgrounds */
--muted-foreground: 220 9% 55%;  /* #838b98 - Secondary text */
--border: 220 13% 16%;           /* #252a32 - Borders */
--primary: 217 91% 60%;          /* #3b82f6 - Primary blue */
--primary-foreground: 0 0% 98%;  /* #fafafa - Text on primary */
```

### Semantic Colors

| Token | Color | Use Case |
|-------|-------|----------|
| `primary` | Blue #3b82f6 | Primary actions, links, focus |
| `secondary` | Green #10b981 | Success states, positive actions |
| `destructive` | Red | Delete, error states |
| `muted` | Gray | Disabled, secondary elements |

### Opacity Guidelines

- Primary text: 100% (`text-foreground`)
- Secondary text: 55-70% (`text-muted-foreground`)
- Disabled text: 50% (`opacity-50`)
- Borders: 16-20% lightness in dark mode
- Hover states: +10% lightness or primary/10 overlay

---

## Icon Guidelines

Using Lucide React icons.

| Context | Size | Tailwind |
|---------|------|----------|
| Button icon | 14px | `size-3.5` or `w-3.5 h-3.5` |
| Button icon (sm) | 12px | `size-3` or `w-3 h-3` |
| Standalone | 16px | `size-4` or `w-4 h-4` |
| Large/Hero | 20-24px | `size-5` or `size-6` |

### Icon Best Practices

- Use `stroke-width={1.5}` for lighter appearance
- Icons in buttons should be same color as text
- Use opacity for secondary/muted icons
- Maintain consistent sizing within component groups

---

## Border Radius

| Token | Value | Tailwind | Use Case |
|-------|-------|----------|----------|
| sm | 4px | `rounded-sm` | Small elements, badges |
| default | 6px | `rounded-md` | Buttons, inputs, cards |
| lg | 8px | `rounded-lg` | Large cards, modals |
| full | 9999px | `rounded-full` | Pills, avatars, chips |

---

## Shadows

Minimal shadows in dark theme for performance.

| Level | Tailwind | Use Case |
|-------|----------|----------|
| None | `shadow-none` | Default for most elements |
| sm | `shadow-sm` | Subtle lift on hover |
| default | `shadow` | Modals, dropdowns |
| lg | `shadow-lg` | Floating elements |

---

## Animation & Transitions

- **Duration**: 150-200ms for micro-interactions, 300ms for larger transitions
- **Easing**: `ease-out` for enters, `ease-in` for exits
- **Reduce motion**: Always respect `prefers-reduced-motion`

```tsx
// Standard transition
className="transition-colors duration-150"

// Hover/active states
className="transition-all duration-200 hover:bg-primary/10 active:scale-[0.98]"
```

---

## Responsive Breakpoints

| Breakpoint | Width | Use Case |
|------------|-------|----------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablets |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1400px | Wide screens |

### Layout Guidelines

- Mobile-first approach
- Stack layouts vertically on mobile, horizontal on desktop (lg+)
- Fixed sidebars appear at lg breakpoint
- Collapse navigation to hamburger at md

---

## Accessibility Requirements

1. **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
2. **Focus States**: Visible focus rings on all interactive elements
3. **Touch Targets**: Minimum 44x44px for touch devices
4. **Screen Readers**: Proper ARIA labels, semantic HTML
5. **Keyboard Navigation**: All functionality accessible via keyboard

---

## File Structure

```
src/
├── components/
│   └── ui/           # Base UI components (Button, Input, etc.)
├── pages/
│   └── StyleGuide.tsx  # Interactive style guide
└── index.css         # Global styles, CSS variables
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-07 | Initial design system based on Character Hub/Studio designs |

---

## References

- Design mockups: `docs/01-PAGES/09-CHARACTER_HUB/character_hub.png`, `character_studio.png`
- Tailwind CSS: <https://tailwindcss.com/docs>
- Lucide Icons: <https://lucide.dev/icons>
- shadcn/ui: <https://ui.shadcn.com>
