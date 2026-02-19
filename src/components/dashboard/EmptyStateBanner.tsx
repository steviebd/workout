'use client'

import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'

export function EmptyStateBanner() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const dismissed = localStorage.getItem('empty-state-banner-dismissed')
    if (dismissed) {
      setIsVisible(false)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem('empty-state-banner-dismissed', 'true')
  }

  if (!isVisible) return null

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <span className="text-2xl">👋</span>
            </div>
            <h2 className="text-lg font-semibold">Welcome to Fit Workout!</h2>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Dismiss
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          You're just getting started. Here's how to begin your strength journey:
        </p>

        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </span>
            <div>
              <p className="font-medium">Browse Programs</p>
              <p className="text-muted-foreground">
                Choose a program that matches your experience level
              </p>
            </div>
          </div>

          <div className="ml-9 flex flex-col gap-1 text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>
                <strong>Beginner</strong> — StrongLifts 5×5 (great for starters!)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span>
                <strong>Intermediate</strong> — 5/3/1, nSuns LP, and more
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-volume" />
              <span>
                <strong>Advanced</strong> — Sheiko and other high-volume programs
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              2
            </span>
            <div>
              <p className="font-medium">Enter Your 1RM</p>
              <p className="text-muted-foreground">
                The max weight you can lift for one rep. Not sure? We'll help you test it!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              3
            </span>
            <div>
              <p className="font-medium">Start Crushing Your Workouts 💪</p>
              <p className="text-muted-foreground">
                Follow your program and watch your strength grow
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button asChild={true} className="w-full">
            <Link to="/programs">
              Browse Programs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}
