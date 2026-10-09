import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

// Wraps pages that need a logged-in user. Pass allowedRoles to also limit a
// page to certain roles, e.g. <ProtectedRoute allowedRoles={['freelancer']} />.
//
// This only controls what the UI shows. The API enforces the real rules on
// every request, so hiding a page here is a convenience, not security.
function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated, checking } = useAuth()
  const location = useLocation()

  if (checking) {
    return <p>Checking your session...</p>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default ProtectedRoute