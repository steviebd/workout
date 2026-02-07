# Component Documentation

## UI Component Library
All UI components use Radix UI primitives under the hood.

## Pattern: CVA Variants
```typescript
const buttonVariants = cva("base-styles", {
  variants: {
    variant: { primary: "...", secondary: "..." },
    size: { sm: "...", md: "...", lg: "..." }
  }
});
```

## Pattern: Compound Components
Dialog, Select, Drawer use compound component pattern.

## Icon Usage
Use Lucide React icons:
```tsx
import { Plus, Trash, Edit } from 'lucide-react';
```

## File Locations
- Primitive components: `src/components/ui/`
- Feature components: `src/components/{feature}/` (achievements, dashboard, progress, workouts)
- Shared layouts: `src/components/PageLayout.tsx`
