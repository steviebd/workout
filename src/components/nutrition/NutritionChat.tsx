'use client'

import { Send, Loader2 } from 'lucide-react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MealImageCapture } from './MealImageCapture'
import { SaveMealDialog } from './SaveMealDialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/app/ToastProvider'
import { cn } from '~/lib/cn'

interface NutritionChatProps {
  date: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  analysis?: {
    name: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
  }
}

interface UseChatReturn {
  messages: ChatMessage[]
  input: string
  setInput: (input: string) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  isLoading: boolean
  append: (message: { role: 'user' | 'assistant'; content: string }) => void
}

function useChat({ apiUrl, date }: { apiUrl: string; date: string }): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const abortController = new AbortController()

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map(({ role, content }) => ({ role, content })),
          date,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
      }
      setMessages((prev) => [...prev, assistantMessage])

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += new TextDecoder().decode(value)
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          const data = line.startsWith('data: ') ? line.slice(6) : line
          if (data === '[DONE]') break
          try {
            const delta = JSON.parse(data)
            if (delta.type === 'text-delta' && delta.text) {
              assistantMessage.content += delta.text
            }
          } catch {
            // Not valid JSON, skip
          }
        }

        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.id === assistantMessage.id) {
            return [...prev.slice(0, -1), { ...assistantMessage }]
          }
          return prev
        })
      }

      // Try to extract meal analysis from JSON block in the response
      const jsonMatch = assistantMessage.content.match(/```json\s*([\s\S]*?)```/)
        ?? assistantMessage.content.match(/\{[\s\S]*"name"[\s\S]*"calories"[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0])
          if (parsed.name && parsed.calories !== null) {
            assistantMessage.analysis = {
              name: parsed.name,
              calories: parsed.calories,
              proteinG: parsed.proteinG ?? 0,
              carbsG: parsed.carbsG ?? 0,
              fatG: parsed.fatG ?? 0,
            }
            setMessages((prev) => {
              const last = prev[prev.length - 1]
              if (last?.id === assistantMessage.id) {
                return [...prev.slice(0, -1), { ...assistantMessage }]
              }
              return prev
            })
          }
        } catch {
          // No valid meal analysis found
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User cancelled, ignore
      } else {
        console.error('Chat error:', err)
        toast.error('Failed to get response')
      }
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, date, isLoading, apiUrl])

  const append = useCallback((message: { role: 'user' | 'assistant'; content: string }) => {
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      ...message,
    }
    setMessages((prev) => [...prev, newMessage])
  }, [])

  return { messages, input, setInput, handleSubmit, isLoading, append }
}

export function NutritionChat({ date }: NutritionChatProps) {
  const queryClient = useQueryClient()
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [pendingAnalysis, setPendingAnalysis] = useState<{
    name: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, setInput, handleSubmit, isLoading, append } = useChat({
    apiUrl: '/api/nutrition/chat',
    date,
  })

  const saveMutation = useMutation({
    mutationFn: async (data: {
      name: string
      mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
      calories: number
      proteinG: number
      carbsG: number
      fatG: number
    }) => {
      const res = await fetch('/api/nutrition/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, date }),
      })
      if (!res.ok) throw new Error('Failed to save entry')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['nutrition-daily-summary'] })
      toast.success('Meal saved successfully')
      setShowSaveDialog(false)
      setPendingAnalysis(null)
    },
    onError: () => {
      toast.error('Failed to save meal')
    },
  })

  const handleSaveClick = (analysis: {
    name: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
  }) => {
    setPendingAnalysis(analysis)
    setShowSaveDialog(true)
  }

  const handleSaveConfirm = (data: {
    name: string
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
  }) => {
    saveMutation.mutate(data)
  }

  const handleImageCapture = (_base64: string) => {
    append({
      role: 'user',
      content: `[Image uploaded]`,
    })
  }

  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Ask me about your meals or get nutrition advice
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['What should I eat?', 'Analyse my meal', 'Show remaining macros'].map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-4 py-2',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.analysis !== null && message.analysis !== undefined ? (
                <div className="mt-2 pt-2 border-t border-current/20">
                  <p className="font-medium">{message.analysis.name}</p>
                  <p className="text-sm opacity-80">
                    {message.analysis.calories} kcal | P: {message.analysis.proteinG}g | C: {message.analysis.carbsG}g | F: {message.analysis.fatG}g
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={() => handleSaveClick(message.analysis!)}
                  >
                    Save Meal
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {isLoading ? (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t pt-4">
        <form onSubmit={(e) => { void handleSubmit(e) }} className="flex gap-2">
          <MealImageCapture onCapture={handleImageCapture} />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about nutrition..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      <SaveMealDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        analysis={pendingAnalysis}
        onSave={handleSaveConfirm}
      />
    </div>
  )
}
