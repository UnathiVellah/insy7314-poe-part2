import { useState } from 'react'
import { DESCRIPTION_MAX, TITLE_MAX, hasErrors, validateGigForm } from '../utils/gigValidation'
import FormField from './FormField'
import StatusMessage from './StatusMessage'

// The form used both to create a gig and to edit one.
//
//   initialValues - the gig being edited (leave out when creating)
//   onSubmit      - async function that receives { title, description, price }.
//                   If it throws, the error message is shown under the form.
//   idPrefix      - keeps field ids unique when several forms are on one page
function GigForm({ initialValues, submitLabel, onSubmit, onCancel, idPrefix = 'gig' }) {
  const [form, setForm] = useState({
    title: initialValues?.title ?? '',
    description: initialValues?.description ?? '',
    price: initialValues?.price != null ? String(initialValues.price) : '',
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('')

    const validationErrors = validateGigForm(form)
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) {
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
      })
    } catch (error) {
      setStatus(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StatusMessage type="error" message={status} />

      <FormField
        id={`${idPrefix}-title`}
        label="Title"
        type="text"
        maxLength={TITLE_MAX}
        value={form.title}
        onChange={update('title')}
        error={errors.title}
      />

      <FormField
        as="textarea"
        id={`${idPrefix}-description`}
        label="Description"
        rows={4}
        maxLength={DESCRIPTION_MAX}
        value={form.description}
        onChange={update('description')}
        error={errors.description}
      />

      <FormField
        id={`${idPrefix}-price`}
        label="Price (ZAR)"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={form.price}
        onChange={update('price')}
        error={errors.price}
      />

      <div className="button-row">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default GigForm
