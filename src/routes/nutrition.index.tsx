import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { NutritionDashboard } from '@/components/nutrition/NutritionDashboard'
import { PageLayout } from '@/components/ui/PageLayout'
import { Button } from '@/components/ui/Button'
import { useDateFormat } from '@/lib/context/UserPreferencesContext'

function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0]
}

function NutritionPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const { formatDate } = useDateFormat()

  const dateString = formatDateForApi(selectedDate)
  const isToday = formatDateForApi(new Date()) === dateString

  const goToPreviousDay = () => {
    setSelectedDate((d) => {
      const newDate = new Date(d)
      newDate.setDate(newDate.getDate() - 1)
      return newDate
    })
  }

  const goToNextDay = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (selectedDate >= tomorrow) return

    setSelectedDate((d) => {
      const newDate = new Date(d)
      newDate.setDate(newDate.getDate() + 1)
      return newDate
    })
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  return (
    <PageLayout
      title="Nutrition"
      subtitle={isToday ? 'Today' : formatDate(dateString)}
    >
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" size="sm" onClick={goToPreviousDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={goToNextDay} disabled={isToday}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <NutritionDashboard date={dateString} />
    </PageLayout>
  )
}

export const Route = createFileRoute('/nutrition/')({
  component: NutritionPage,
})
