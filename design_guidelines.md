# BUMA OPS - Design Guidelines

## Design Approach

**System Selected:** Hybrid approach combining Linear's clarity + Notion's information density + Material Design's mobile patterns

**Rationale:** Internal operations platform requiring maximum efficiency, clear data hierarchy, and reliable mobile-field performance. Utility-focused design prioritizing speed of use over visual flourish.

**Core Principles:**
- Information clarity over decoration
- Mobile-first with desktop optimization
- Role-based interface adaptation
- Status-driven visual hierarchy
- Operational efficiency in every interaction

---

## Typography System

**Font Stack:** Inter (primary) via Google Fonts
- Headers: 600 weight
- Body: 400 weight  
- Data/Numbers: 500 weight (tabular-nums)
- Labels: 500 weight, uppercase, tracking-wide

**Hierarchy:**
- Page titles: text-2xl (mobile), text-3xl (desktop)
- Section headers: text-xl
- Card titles: text-lg
- Body text: text-base
- Captions/metadata: text-sm
- Micro-labels: text-xs

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 (mobile), p-6 (desktop)
- Section gaps: space-y-6 (mobile), space-y-8 (desktop)
- Card spacing: p-4 interior, gap-4 between elements
- Form fields: space-y-4
- Dashboard metrics: gap-6

**Containers:**
- Mobile: px-4, max-w-full
- Desktop: max-w-7xl, px-8
- Form containers: max-w-2xl
- Dashboard panels: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

---

## Component Library

### Navigation
**Mobile (Executives):**
- Bottom tab bar with 4 primary sections: Visitas, Tickets, Edificios, Perfil
- Top bar: page title + context actions (filter, create)

**Desktop (Managers):**
- Left sidebar navigation with expandable sections
- Top bar: breadcrumbs, search, notifications, user menu

### Status Indicators
- **Priority badges:** Rounded-full, px-3, py-1, text-xs, font-medium
- **Semaphore states:** Border-l-4 on cards with status thickness
- **Visit states:** Pill badges with icons
- **Progress indicators:** Linear progress bars for visit completion

### Cards & Lists
- **Visit cards:** Border, rounded-lg, p-4, with metadata row (building, date, status)
- **Ticket cards:** Compact design, border-l-4 priority indicator, grid layout for fields
- **Dashboard metrics:** Centered numbers (text-4xl), label below (text-sm), optional trend indicator
- **Equipment list:** Simple rows with checkbox/edit states, divider between items

### Forms
- **Field groups:** Space-y-4, label-above-input pattern
- **Labels:** Text-sm, font-medium, mb-2
- **Inputs:** Border, rounded-md, px-3, py-2, focus states with ring
- **Select dropdowns:** Native select styling with consistent height
- **Textareas:** Min-h-24, resize-vertical
- **File upload:** Dashed border dropzone, preview thumbnails below
- **Required indicators:** Asterisk in label

### Data Display
- **Tables:** Striped rows, sticky header, responsive horizontal scroll on mobile
- **Empty states:** Centered icon + message + action button
- **Stat grids:** 2-column mobile, 3-4 column desktop
- **Timeline:** Vertical line with dots for visit/incident history

### Actions
- **Primary CTAs:** Rounded-lg, px-6, py-3, font-medium (mobile full-width when contextual)
- **Secondary buttons:** Border, rounded-lg, px-4, py-2
- **Icon buttons:** Rounded-md, p-2, hover states
- **Floating action button (mobile):** Fixed bottom-right for "Iniciar Visita"

### Dashboards
- **Semaphore columns:** 3-column grid (🔴🟠🟢), each with count header + filterable table
- **Manager actions:** Dropdown menu (⋮) on each row for reasignar/escalar/crear visita
- **Charts:** Simple bar/line charts for visit coverage, workload distribution
- **Filters:** Top bar with building/executive/date range selectors

---

## Mobile vs Desktop Patterns

**Mobile (Executives):**
- Single-column layouts
- Bottom sheet modals for forms
- Swipe actions on list items
- Large tap targets (min 44x44)
- Sticky headers during scroll
- Camera integration for photo capture
- Full-screen checklist during active visit

**Desktop (Managers):**
- Multi-column dashboards
- Modal dialogs for forms (centered, max-w-2xl)
- Hover states on interactive elements
- Keyboard shortcuts for common actions
- Table sorting/filtering in-place
- Split-view for detail panels

---

## Critical Implementation Notes

- **No animations** except loading spinners and state transitions
- **Accessibility:** Proper ARIA labels on all form controls, keyboard navigation for tables
- **Responsive images:** Photo uploads sized appropriately (max 1200px width), thumbnails for lists
- **Print-friendly:** Visit reports styled for PDF export with page breaks
- **Offline indicators:** Show connection status for mobile field use