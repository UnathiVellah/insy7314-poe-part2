import { useEffect, useState } from 'react'
import GigForm from '../components/GigForm'
import ManageGigCard from '../components/ManageGigCard'
import StatusMessage from '../components/StatusMessage'
import { useAuth } from '../context/useAuth'
import * as gigService from '../services/gigService'

const newestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)

// Freelancers manage their own gigs here. The API has no "my gigs" endpoint,
// so the page loads every gig and keeps the ones this user owns. The API still
// checks ownership on every create, update and delete.
function MyGigsPage() {
  const { user } = useAuth()
  const [gigs, setGigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false

    gigService
      .listGigs()
      .then((data) => {
        if (!cancelled) setGigs(data.filter((gig) => gig.ownerId === user.id).sort(newestFirst))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user.id])

  const handleCreate = async (values) => {
    const created = await gigService.createGig(values)
    setGigs((current) => [created, ...current])
    setCreating(false)
    setNotice('Your gig has been created.')
  }

  const handleUpdate = async (id, values) => {
    const updated = await gigService.updateGig(id, values)
    setGigs((current) => current.map((gig) => (gig.id === id ? updated : gig)))
    setNotice('Your gig has been updated.')
  }

  const handleDelete = async (id) => {
    await gigService.deleteGig(id)
    setGigs((current) => current.filter((gig) => gig.id !== id))
    setNotice('Your gig has been deleted.')
  }

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <h1>My gigs</h1>
          <p>Create and manage the services you offer to clients.</p>
        </div>

        {!creating && !loading && !error && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setNotice('')
              setCreating(true)
            }}
          >
            New gig
          </button>
        )}
      </div>

      <StatusMessage type="error" message={error} />
      <StatusMessage type="success" message={notice} />

      {loading && <p role="status">Loading your gigs...</p>}

      {creating && (
        <div className="card form-card">
          <h2>Create a new gig</h2>
          <GigForm
            idPrefix="new-gig"
            submitLabel="Create gig"
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {!loading && !error && gigs.length === 0 && !creating && (
        <p className="muted">You have not created any gigs yet. Choose New gig to add your first one.</p>
      )}

      {!loading && !error && gigs.length > 0 && (
        <div className="gig-grid">
          {gigs.map((gig) => (
            <ManageGigCard key={gig.id} gig={gig} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </section>
  )
}

export default MyGigsPage
