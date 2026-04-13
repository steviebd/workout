import { ArrowLeft } from 'lucide-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { NutritionChat } from '@/components/nutrition/NutritionChat'
import { Button } from '@/components/ui/Button'

function NutritionChatPage() {
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => { void navigate({ to: '/nutrition' }) }}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <NutritionChat date={today} />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/nutrition/chat')({
  component: NutritionChatPage,
})
