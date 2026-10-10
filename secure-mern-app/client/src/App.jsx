import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import BookingsPage from './pages/BookingsPage'
import DashboardPage from './pages/DashboardPage'
import GigsPage from './pages/GigsPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MyGigsPage from './pages/MyGigsPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Pages below need a logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/gigs" element={<GigsPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
        </Route>

        {/* Freelancer-only pages */}
        <Route element={<ProtectedRoute allowedRoles={['freelancer']} />}>
          <Route path="/my-gigs" element={<MyGigsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App