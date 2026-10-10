import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

// Placeholder dashboard. Later branches add the role-specific content
// (gigs and bookings for clients, gig management and income for freelancers).
function DashboardPage() {
  const { user } = useAuth()

  return (
    <section className="card">
      <h1>Welcome, {user.fullName}</h1>
      <p>
        You are logged in as <span className="badge">{user.role}</span>
      </p>
      <p>Your role-specific tools will appear here.</p>
      <div className="button-row">
        {user.role === 'freelancer' && (
          <Link to="/my-gigs" className="btn btn-primary">
            Manage my gigs
          </Link>
        )}
        {user.role === 'freelancer' && (
          <Link to="/income" className="btn btn-primary">
            View income
          </Link>
        )}
        <Link to="/gigs" className="btn btn-primary">
          Browse gigs
        </Link>
        <Link to="/bookings" className="btn btn-secondary">
          View bookings
        </Link>
      </div>
    </section>
  )
}

export default DashboardPage
