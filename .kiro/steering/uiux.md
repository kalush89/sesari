---
inclusion: always
---

---
inclusion: always
---

# UI/UX Implementation Guidelines

## Design System Standards

### Color Palette (Tailwind Classes Only)
```typescript
// Use these exact Tailwind classes
const colors = {
  primary: 'blue-600',           // CTAs, focus states
  primaryHover: 'blue-700',      // Button hover states
  success: 'green-600',          // Positive metrics, completed ogjectives
  danger: 'red-600',             // Errors, delete actions
  background: 'gray-50',         // Page backgrounds (light mode)
  backgroundDark: 'gray-900',    // Navigation, dark sections
  text: 'gray-900',              // Primary text
  textMuted: 'gray-600',         // Secondary text
  border: 'gray-200',            // Card borders, dividers
}
```

### Typography Hierarchy
- **Page titles**: `text-3xl font-semibold text-gray-900`
- **Section headers**: `text-xl font-medium text-gray-900`
- **Card titles**: `text-lg font-medium text-gray-900`
- **Body text**: `text-base text-gray-700`
- **Captions**: `text-sm text-gray-600`

### Spacing System
Use Tailwind's 4-point scale: `p-4`, `p-6`, `p-8`, `mb-4`, `mb-6`, `gap-4`

## Component Templates

### Button Variants
```typescript
// Primary CTA
className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200"

// Secondary action
className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md transition-colors duration-200"

// Danger action
className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
```

### Card Components
```typescript
// Standard card
className="bg-white shadow-sm rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow duration-200"

// KPI card with metric display
className="bg-white shadow-sm rounded-lg p-6 border border-gray-200"
```

### Form Elements
```typescript
// Input field
className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

// Label
className="block text-sm font-medium text-gray-700 mb-1"

// Error message
className="text-red-600 text-sm mt-1"
```

## Layout Patterns

### Dashboard Structure
```typescript
// Main layout
<div className="min-h-screen bg-gray-50">
  <Sidebar /> {/* Fixed left navigation */}
  <main className="ml-64 p-6"> {/* Content area */}
    <header className="mb-6">
      <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
    </header>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* KPI cards */}
    </div>
  </main>
</div>
```

### Sidebar Navigation
```typescript
// Navigation structure
className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white"
// Active nav item
className="bg-blue-600 text-white px-4 py-2 rounded-md"
// Inactive nav item  
className="text-gray-300 hover:text-white hover:bg-gray-700 px-4 py-2 rounded-md"
```

## Responsive Design Rules

### Breakpoint Strategy
- **Mobile first**: Design for `min-width: 320px`
- **Tablet**: `sm:` (640px) - Stack cards, collapse sidebar
- **Desktop**: `lg:` (1024px) - Full grid layout, fixed sidebar
- **Large**: `xl:` (1280px) - Wider content area

### Mobile Adaptations
```typescript
// Grid responsive pattern
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"

// Sidebar mobile toggle
className="lg:hidden" // Show hamburger on mobile
className="hidden lg:block" // Hide sidebar on mobile by default
```

## State Patterns

### Loading States
```typescript
// Skeleton loader
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>

// Spinner
<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
```

### Empty States
```typescript
// Empty dashboard
<div className="text-center py-12">
  <h3 className="text-lg font-medium text-gray-900 mb-2">No KPIs yet</h3>
  <p className="text-gray-600 mb-4">Add your first KPI to get started</p>
  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
    Add KPI
  </button>
</div>
```

### Error States
```typescript
// Error message
<div className="bg-red-50 border border-red-200 rounded-md p-4">
  <p className="text-red-800">Failed to load KPIs. Please try again.</p>
</div>
```

## Accessibility Requirements

### Semantic HTML
- Use `<nav>`, `<main>`, `<section>`, `<article>` appropriately
- Button elements for interactive actions (not divs)
- Proper heading hierarchy (`h1` → `h2` → `h3`)

### ARIA Labels
```typescript
// Interactive elements
aria-label="Add new KPI"
aria-describedby="error-message"
role="button"
tabIndex={0}
```

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Visible focus states with `focus:ring-2 focus:ring-blue-500`
- Logical tab order

## Performance Guidelines

### Component Optimization
- Use React Server Components by default
- Add `'use client'` only for interactivity
- Implement proper loading states for async operations
- Use React.memo() for expensive re-renders

### Bundle Size
- Import only needed Tailwind classes
- Avoid large icon libraries (use Heroicons selectively)
- Lazy load non-critical components

## Implementation Checklist

When creating UI components:
- [ ] Uses only Tailwind classes (no custom CSS)
- [ ] Includes hover and focus states
- [ ] Implements loading and error states
- [ ] Works on mobile (320px minimum)
- [ ] Follows semantic HTML structure
- [ ] Includes proper TypeScript interfaces
- [ ] Has keyboard navigation support
- [ ] Maintains consistent spacing and typography