import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import FormField from '../components/FormField'
import StatusMessage from '../components/StatusMessage'
import { useAuth } from '../context/useAuth'
import { PASSWORD_MAX, hasErrors, validateRegister } from '../utils/validation'

function RegisterPage() {
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client',
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('')

    const validationErrors = validateRegister(form)
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) {
      return
    }

    setLoading(true)
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      })
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (error) {
      setStatus(error.message)
      setLoading(false)
    }
  }

  return (
    <section className="card auth-card">
      <h1>Create your account</h1>

      <StatusMessage type="error" message={status} />

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="fullName"
          label="Full name"
          type="text"
          autoComplete="name"
          value={form.fullName}
          onChange={updateField}
          error={errors.fullName}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={updateField}
          error={errors.email}
        />

        <div className="form-field">
          <label htmlFor="role">I want to join as</label>
          <select
            id="role"
            name="role"
            value={form.role}
            onChange={updateField}
            aria-invalid={errors.role ? 'true' : 'false'}
          >
            <option value="client">Client - I want to hire freelancers</option>
            <option value="freelancer">Freelancer - I want to offer my services</option>
          </select>
          {errors.role && <p className="field-error">{errors.role}</p>}
        </div>

        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={form.password}
          onChange={updateField}
          error={errors.password}
        />
        <FormField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={form.confirmPassword}
          onChange={updateField}
          error={errors.confirmPassword}
        />
        <p className="form-hint">Use 8 to 72 characters.</p>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="form-footer">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </section>
  )
}

export default RegisterPage