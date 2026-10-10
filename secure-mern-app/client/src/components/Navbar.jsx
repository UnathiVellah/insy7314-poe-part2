import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          HustleHub+
        </Link>

        <nav aria-label="Main navigation" className="nav-links">
          <NavLink to="/" end>
            Home
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink to="/gigs">Browse gigs</NavLink>
              <NavLink to="/bookings">Bookings</NavLink>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <span className="nav-user">
                {user.fullName} ({user.role})
              </span>
              <button type="button" className="btn btn-secondary" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Navbar