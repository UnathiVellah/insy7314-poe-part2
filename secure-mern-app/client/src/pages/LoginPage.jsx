import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import FormField from '../components/FormField'
import StatusMessage from '../components/StatusMessage'
import { useAuth } from '../context/useAuth'
import { hasErrors, validateLogin } from '../utils/validation'

function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  // Where to go after logging in: the page the user originally wanted, or the dashboard.
  const redirectTo = location.state?.from?.pathname || '/dashboard'
  const justRegistered = Boolean(location.state?.registered)

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('')

    const validationErrors = validateLogin(form)
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) {
      return
    }

    setLoading(true)
    try {
      await login(form.email.trim(), form.password)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card auth-card">
      <h1>Log in</h1>

      {justRegistered && <StatusMessage type="success" message="Account created. Please log in." />}
      <StatusMessage type="error" message={status} />

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={updateField}
          error={errors.email}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={updateField}
          error={errors.password}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="form-footer">
        No account yet? <Link to="/register">Register</Link>
      </p>
    </section>
  )
}

export default LoginPage