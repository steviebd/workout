import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SetLogger } from '~/components/workouts/SetLogger'
import { UserPreferencesProvider } from '~/lib/context/UserPreferencesContext'

vi.mock('~/hooks/use-set-logger-state', () => ({
  useSetLoggerState: vi.fn(() => ({
    weight: 135,
    reps: 10,
    isEditingWeight: false,
    isEditingReps: false,
    swipeOffset: 0,
    isSwiping: false,
    containerRef: { current: null },
    weightInputRef: { current: null },
    repsInputRef: { current: null },
    adjustWeight: vi.fn(),
    adjustReps: vi.fn(),
    setWeight: vi.fn(),
    handleWeightChange: vi.fn(),
    handleRepsChange: vi.fn(),
    handleWeightKeyDown: vi.fn(),
    handleRepsKeyDown: vi.fn(),
    startEditingWeight: vi.fn(),
    startEditingReps: vi.fn(),
    handleWeightBlur: vi.fn(),
    handleRepsBlur: vi.fn(),
  })),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const renderWithProviders = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={testQueryClient}>
      <UserPreferencesProvider>{ui}</UserPreferencesProvider>
    </QueryClientProvider>
  )
}

describe('SetLogger', () => {
  const mockSet = {
    id: 'test-set-id',
    reps: 10,
    weight: 135,
    completed: false,
  }

  const mockOnUpdate = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders set row container', () => {
    const { container } = renderWithProviders(
      <SetLogger
        setNumber={1}
        set={mockSet}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const setRow = container.querySelector('.rounded-xl')
    expect(setRow).not.toBeNull()
    expect(setRow?.classList.contains('border-border/70')).toBe(true)
  })

  it('renders set number badge', () => {
    const { container } = renderWithProviders(
      <SetLogger
        setNumber={1}
        set={mockSet}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const setNumberBadge = container.querySelector('.shrink-0.rounded-full.bg-secondary')
    expect(setNumberBadge).not.toBeNull()
    expect(setNumberBadge?.textContent).toBe('1')
  })

  it('renders weight input with correct value', () => {
    const { container } = renderWithProviders(
      <SetLogger
        setNumber={1}
        set={mockSet}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const weightInput = container.querySelector('[aria-label="Edit weight"]')
    expect(weightInput).not.toBeNull()
    expect(weightInput?.textContent?.includes('135')).toBe(true)
  })

  it('renders reps input with correct value', () => {
    const { container } = renderWithProviders(
      <SetLogger
        setNumber={1}
        set={mockSet}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const repsInput = container.querySelector('[aria-label="Edit reps"]')
    expect(repsInput).not.toBeNull()
    expect(repsInput?.textContent?.includes('10')).toBe(true)
  })

  it('renders delete button when onDelete is provided', () => {
    const { container } = renderWithProviders(
      <SetLogger
        setNumber={1}
        set={mockSet}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const deleteButton = container.querySelector('[aria-label="Delete set"]')
    expect(deleteButton).not.toBeNull()
  })

  it('does not render delete button when onDelete is not provided', () => {
    const { container } = renderWithProviders(
      <SetLogger
        setNumber={1}
        set={mockSet}
        onUpdate={mockOnUpdate}
      />
    )

    const deleteButton = container.querySelector('[aria-label="Delete set"]')
    expect(deleteButton).toBeNull()
  })

  it('renders completed state with success border', () => {
    const completedSet = { ...mockSet, completed: true }
    const { container } = renderWithProviders(
      <SetLogger
        setNumber={1}
        set={completedSet}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const setRow = container.querySelector('.rounded-xl')
    expect(setRow?.classList.contains('border-success/50')).toBe(true)
  })

  it('renders weight/reps buttons', () => {
    const { container } = renderWithProviders(
      <SetLogger
        setNumber={1}
        set={mockSet}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(container.querySelector('[aria-label="Decrease weight"]')).not.toBeNull()
    expect(container.querySelector('[aria-label="Increase weight"]')).not.toBeNull()
    expect(container.querySelector('[aria-label="Decrease reps"]')).not.toBeNull()
    expect(container.querySelector('[aria-label="Increase reps"]')).not.toBeNull()
  })

  it('has delete button that fits within container bounds', () => {
    const { container } = renderWithProviders(
      <SetLogger
        setNumber={1}
        set={mockSet}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const setRow = container.querySelector('.rounded-xl') as HTMLElement
    const deleteButton = container.querySelector('[aria-label="Delete set"]') as HTMLElement

    expect(setRow).not.toBeNull()
    expect(deleteButton).not.toBeNull()

    const rowRect = setRow.getBoundingClientRect()
    const buttonRect = deleteButton.getBoundingClientRect()

    expect(buttonRect.right).toBeLessThanOrEqual(rowRect.right + 1)
    expect(buttonRect.left).toBeGreaterThanOrEqual(rowRect.left)
  })
})