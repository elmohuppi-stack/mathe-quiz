import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) {
    return <div className="text-center mt-20">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Mathe-Quiz</h1>
          <div className="space-x-4">
            <span className="text-gray-700">Welcome, {user.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-bold mb-2">Kopfrechnen</h3>
            <p className="text-gray-600 mb-4">Train your mental math skills</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Start Training
            </button>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-bold mb-2">Brueche & Prozent</h3>
            <p className="text-gray-600 mb-4">Master fractions and percentages</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Start Training
            </button>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-bold mb-2">Algebra</h3>
            <p className="text-gray-600 mb-4">Solve equations step-by-step</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Start Training
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
