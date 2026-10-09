import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <section className="hero">
      <h1>HustleHub+</h1>
      <p>
        A secure freelance marketplace. Freelancers advertise their services, clients browse and
        book them, and every booking is recorded so income is always tracked.
      </p>

      <div className="hero-actions">
        {isAuthenticated ? (
          <Link to="/dashboard" className="btn btn-primary">
            Go to your dashboard
          </Link>
        ) : (
          <>
            <Link to="/register" className="btn btn-primary">
              Get started
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Log in
            </Link>
          </>
        )}
      </div>
    </section>
  )
}

export default HomePage