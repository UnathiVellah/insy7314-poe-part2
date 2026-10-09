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
    </section>
  )
}

export default DashboardPage