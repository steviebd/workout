import { createFileRoute, Outlet } from '@tanstack/react-router'

function NutritionLayout() {
  return <Outlet />
}

export const Route = createFileRoute('/nutrition')({
  component: NutritionLayout,
})