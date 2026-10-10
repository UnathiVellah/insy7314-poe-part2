import { useState } from 'react'
import GigCard from './GigCard'
import GigForm from './GigForm'
import StatusMessage from './StatusMessage'

// A gig the freelancer owns, with Edit and Delete in place on the card:
//   view -> editing                 (save or cancel returns to view)
//   view -> confirmingDelete        (deleting asks for confirmation first)
//
// onUpdate(id, values) and onDelete(id) are async and supplied by the page.
// Only the owner can change a gig - the API enforces that, this is for convenience.
function ManageGigCard({ gig, onUpdate, onDelete }) {
  const [mode, setMode] = useState('view')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (values) => {
    await onUpdate(gig.id, values)
    setMode('view')
  }

  const handleDelete = async () => {
    setError('')
    setDeleting(true)

    try {
      await onDelete(gig.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  const cancelDelete = () => {
    setError('')
    setMode('view')
  }

  if (mode === 'editing') {
    return (
      <article className="card">
        <h2 className="gig-title">Edit gig</h2>
        <GigForm
          idPrefix={`edit-${gig.id}`}
          initialValues={gig}
          submitLabel="Save changes"
          onSubmit={handleSave}
          onCancel={() => setMode('view')}
        />
      </article>
    )
  }

  if (mode === 'confirmingDelete') {
    return (
      <GigCard gig={gig}>
        <div className="booking-confirm">
          <p>
            Delete <strong>{gig.title}</strong>? This cannot be undone.
          </p>

          <StatusMessage type="error" message={error} />

          <div className="button-row">
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={cancelDelete} disabled={deleting}>
              Cancel
            </button>
          </div>
        </div>
      </GigCard>
    )
  }

  return (
    <GigCard gig={gig}>
      <div className="button-row">
        <button
          type="button"
          className="btn btn-secondary"
          aria-label={`Edit ${gig.title}`}
          onClick={() => setMode('editing')}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-label={`Delete ${gig.title}`}
          onClick={() => setMode('confirmingDelete')}
        >
          Delete
        </button>
      </div>
    </GigCard>
  )
}

export default ManageGigCard
