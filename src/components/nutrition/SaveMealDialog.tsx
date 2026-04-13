import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'

interface SaveMealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysis: {
    name: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
  } | null
  onSave: (data: {
    name: string
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
  }) => void
}

function inferMealTypeFromTime(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours()
  if (hour < 10) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 19) return 'dinner'
  return 'snack'
}

export function SaveMealDialog({ open, onOpenChange, analysis, onSave }: SaveMealDialogProps) {
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack')
  const [calories, setCalories] = useState(0)
  const [proteinG, setProteinG] = useState(0)
  const [carbsG, setCarbsG] = useState(0)
  const [fatG, setFatG] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (analysis) {
      setName(analysis.name)
      setCalories(analysis.calories)
      setProteinG(analysis.proteinG)
      setCarbsG(analysis.carbsG)
      setFatG(analysis.fatG)
      setMealType(inferMealTypeFromTime())
      setErrors({})
    }
  }, [analysis])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (calories < 0 || calories > 10000) {
      newErrors.calories = 'Calories must be between 0 and 10,000'
    }
    if (proteinG < 0 || proteinG > 500) {
      newErrors.proteinG = 'Protein must be between 0 and 500'
    }
    if (carbsG < 0 || carbsG > 1000) {
      newErrors.carbsG = 'Carbs must be between 0 and 1,000'
    }
    if (fatG < 0 || fatG > 500) {
      newErrors.fatG = 'Fat must be between 0 and 500'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave({ name, mealType, calories, proteinG, carbsG, fatG })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Meal</DialogTitle>
          <DialogDescription>Review and save your meal entry</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Meal Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Grilled Chicken Salad"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mealType">Meal Type</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as typeof mealType)}>
              <SelectTrigger id="mealType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="calories">Calories</Label>
            <Input
              id="calories"
              type="number"
              min={0}
              max={10000}
              value={calories}
              onChange={(e) => setCalories(Number(e.target.value))}
            />
            {errors.calories ? <p className="text-xs text-destructive">{errors.calories}</p> : null}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                min={0}
                max={500}
                value={proteinG}
                onChange={(e) => setProteinG(Number(e.target.value))}
              />
              {errors.proteinG ? <p className="text-xs text-destructive">{errors.proteinG}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                min={0}
                max={1000}
                value={carbsG}
                onChange={(e) => setCarbsG(Number(e.target.value))}
              />
              {errors.carbsG ? <p className="text-xs text-destructive">{errors.carbsG}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                min={0}
                max={500}
                value={fatG}
                onChange={(e) => setFatG(Number(e.target.value))}
              />
              {errors.fatG ? <p className="text-xs text-destructive">{errors.fatG}</p> : null}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
