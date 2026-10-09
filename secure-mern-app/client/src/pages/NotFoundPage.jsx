import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="card">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="btn btn-primary">
        Back to home
      </Link>
    </section>
  )
}

export default NotFoundPage