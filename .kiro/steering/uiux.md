---
inclusion: always
---

# Sesari UI/UX Guidelines - MVP Focus

## MVP Design Principles
- **Ship fast, iterate later**: Focus on core functionality over polish
- **Essential features only**: KPI tracking, basic goal creation, simple dashboard
- **Consistent patterns**: Reuse existing components, avoid custom designs
- **Mobile-responsive**: Ensure usability on all devices from day one

## Visual System (MVP)

### Colors (Use Tailwind defaults)
- **Primary**: `blue-600` for CTAs and focus states
- **Success**: `green-600` for positive metrics and completed goals
- **Background**: `gray-50` (light), `gray-900` (dark)
- **Text**: `gray-900` (light), `gray-100` (dark)
- **Borders**: `gray-200` (light), `gray-700` (dark)

### Typography
- Use system fonts: `font-sans` (Tailwind default)
- Hierarchy: `text-3xl`, `text-xl`, `text-lg`, `text-base`, `text-sm`
- Keep it simple - avoid custom font weights

### Spacing
- Use Tailwind spacing scale: `4`, `6`, `8`, `12`, `16`, `24`
- Consistent padding: `p-4` for cards, `p-6` for modals
- Consistent margins: `mb-4` between sections, `mb-6` between major blocks

## Essential Layout Patterns

### Dashboard (Priority 1)
```
Header (fixed)
├── Logo + Workspace name
├── User avatar + menu
└── Add KPI button

Main Content
├── KPI grid (2-3 columns)
├── Recent goals list
└── Quick actions
```

### KPI Cards (Core Component)
- Simple card with title, current value, target, progress bar
- Use `bg-white` with `shadow-sm` and `rounded-lg`
- Include edit/delete actions on hover
- Show trend with simple up/down arrow

### Goal Creation (Priority 2)
- Simple form modal with title, description, target date
- Skip AI suggestions for MVP - focus on manual input
- Basic validation and error states
- Save/cancel buttons

### Navigation (Keep Simple)
- Fixed sidebar with: Dashboard, KPIs, Goals, Settings
- Collapsible on mobile with hamburger menu
- Use `bg-gray-900` with `text-white`

## Component Standards

### Buttons
- Primary: `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md`
- Secondary: `bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md`
- Danger: `bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md`

### Forms
- Input: `border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500`
- Label: `block text-sm font-medium text-gray-700 mb-1`
- Error: `text-red-600 text-sm mt-1`

### Cards
- Standard: `bg-white shadow-sm rounded-lg p-4 border border-gray-200`
- Hover state: `hover:shadow-md transition-shadow duration-200`

### Loading States
- Skeleton: Use `animate-pulse` with `bg-gray-200` rectangles
- Spinner: Simple `animate-spin` with border styling
- Keep loading states minimal and consistent

## MVP Feature Priorities

### Phase 1 (Essential)
1. **KPI Dashboard**: Display manual KPIs in card grid
2. **Add/Edit KPIs**: Simple form to create and modify KPIs
3. **Basic Goals**: Create and list goals (no AI initially)
4. **Authentication**: Google OAuth login
5. **Workspace**: Single workspace per user

### Phase 2 (Enhanced)
1. **KPI Charts**: Simple line/bar charts using basic charting
2. **Goal Progress**: Link KPIs to goals, show progress
3. **Mobile Optimization**: Ensure responsive design works well

### Phase 3 (Advanced)
1. **AI Suggestions**: Add AI-powered goal recommendations
2. **Multiple Workspaces**: Workspace switching
3. **Integrations**: Stripe/GA data import

## UX Guidelines for MVP

### Keep It Simple
- One primary action per page
- Minimal navigation depth (max 2 levels)
- Clear page titles and breadcrumbs
- Avoid complex interactions or animations

### Error Handling
- Show clear, actionable error messages
- Use toast notifications for success/error feedback
- Provide fallback states for failed data loads
- Never show technical error details to users

### Empty States
- Show helpful empty states with clear CTAs
- "Add your first KPI" with prominent button
- "No goals yet? Create one to get started"
- Include brief explanations of what each feature does

### Performance
- Prioritize perceived performance over actual performance
- Show loading states immediately
- Use optimistic updates where possible
- Keep bundle size minimal

## Implementation Rules

### Component Creation
- Start with existing Tailwind classes, avoid custom CSS
- Create reusable components for repeated patterns
- Keep components small and focused
- Include proper TypeScript interfaces

### Responsive Design
- Mobile-first approach using `sm:`, `md:`, `lg:` breakpoints
- Test on mobile devices regularly
- Ensure touch targets are at least 44px
- Stack elements vertically on mobile

### Accessibility (Minimum Requirements)
- Use semantic HTML elements
- Include alt text for images
- Ensure keyboard navigation works
- Maintain color contrast ratios
- Add ARIA labels for interactive elements

## Success Criteria for MVP
- User can add and view KPIs within 2 minutes of signup
- Dashboard loads in under 2 seconds
- Mobile experience is fully functional
- Zero critical accessibility violations
- 90%+ uptime during beta testing