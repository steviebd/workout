import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fit Workout App</h1>
        <p className="text-gray-600 mb-8">Your personal workout tracking app</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="/exercises" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Exercises</h2>
            <p className="text-gray-600">Create and manage your exercises</p>
          </a>
          
          <a href="/templates" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Templates</h2>
            <p className="text-gray-600">Create workout templates</p>
          </a>
          
          <a href="/workouts/new" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Start Workout</h2>
            <p className="text-gray-600">Begin a new workout session</p>
          </a>
        </div>
        
        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <p className="text-gray-600">No workouts yet. Start your first workout!</p>
        </div>
      </div>
    </div>
  )
}
