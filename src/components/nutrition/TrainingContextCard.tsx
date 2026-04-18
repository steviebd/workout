import { Dumbbell } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'

interface TrainingContextCardProps {
  trainingContext: {
    trainingType: string
    customLabel: string | null
  } | null
  programSession: {
    sessionName: string
    targetLifts: string | null
  } | null
  date: string
}

const trainingTypeLabels: Record<string, string> = {
  rest_day: 'Rest Day',
  cardio: 'Cardio',
  powerlifting: 'Powerlifting',
  custom: 'Custom',
}

const trainingTypeBadges: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
  rest_day: 'secondary',
  cardio: 'success',
  powerlifting: 'default',
  custom: 'warning',
}

export function TrainingContextCard({ trainingContext, programSession, date }: TrainingContextCardProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [selectedType, setSelectedType] = useState(trainingContext?.trainingType ?? 'rest_day')

  const upsertMutation = useMutation({
    mutationFn: async (data: { trainingType: string; customLabel?: string }) => {
      const res = await fetch('/api/nutrition/training-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, date }),
      })
      if (!res.ok) throw new Error('Failed to update training context')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['nutrition-daily-summary'] })
      setIsEditing(false)
    },
  })

  const handleSave = () => {
    upsertMutation.mutate({
      trainingType: selectedType,
      customLabel: selectedType === 'custom' ? '' : undefined,
    })
  }

  const hasContext = trainingContext ?? programSession

  if (!hasContext && !isEditing) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Training Context</p>
                <p className="text-xs text-muted-foreground">Not set</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Set
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Training Context</h3>
          </div>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Change
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select training type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rest_day">Rest Day</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="powerlifting">Powerlifting</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="flex-1">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="flex-1" disabled={upsertMutation.isPending}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {trainingContext !== null ? (
              <div className="flex items-center gap-2">
                <Badge variant={trainingTypeBadges[trainingContext.trainingType] ?? 'default'}>
                  {trainingTypeLabels[trainingContext.trainingType] ?? trainingContext.trainingType}
                </Badge>
                {trainingContext.trainingType === 'custom' && trainingContext.customLabel ? (
                  <span className="text-sm text-muted-foreground">{trainingContext.customLabel}</span>
                ) : null}
              </div>
            ) : null}
            {programSession !== null ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Session:</span>
                <span className="font-medium text-foreground">{programSession.sessionName}</span>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
