# ADR 003: Mobile-First Design Approach

## Status

Accepted

## Context

The primary users of Gyan Ghar Accountability App are hostel students who:

- Primarily access the app from smartphones
- Submit daily entries in the morning/evening
- Have varying network connectivity
- Need quick, simple interactions

## Decision

We adopted a mobile-first design approach using Tailwind CSS with responsive breakpoints.

### Design Principles

1. **Touch-friendly targets** - Minimum 44px tap targets
2. **Vertical scrolling** - Natural mobile interaction pattern
3. **Progressive enhancement** - Desktop gets enhanced layouts
4. **Performance focus** - Minimal bundle size, optimized assets

### Breakpoint Strategy

```css
/* Mobile first (default) */
.container { /* mobile styles */ }

/* Tablet and up */
@media (min-width: 768px) { /* md: */ }

/* Desktop and up */
@media (min-width: 1024px) { /* lg: */ }
```

### Component Examples

```jsx
// Responsive navigation
<div className="md:hidden"> {/* Mobile menu button */} </div>
<div className="hidden md:flex"> {/* Desktop navigation */} </div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

### Dashboard Adaptations

- **Mobile**: Horizontally scrollable table with pinned student name column
- **Desktop**: Full table with all columns visible
- **Both**: Column visibility picker for user customization

## Consequences

### Positive

- Optimized for primary use case (mobile)
- Consistent experience across devices
- Tailwind utilities make responsive design easy
- Better performance on mobile networks

### Negative

- Some features simplified for mobile (e.g., bulk actions)
- Testing required across multiple viewports

## Metrics

- Average session on mobile: 2-3 minutes
- Dashboard loads in <1s
- Form submission success rate: 98%+
