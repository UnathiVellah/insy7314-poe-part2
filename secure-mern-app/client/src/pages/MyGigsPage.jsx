import { useEffect, useState } from 'react'
import GigCard from '../components/GigCard'
import GigForm from '../components/GigForm'
import ManageGigCard from '../components/ManageGigCard'
import StatusMessage from '../components/StatusMessage'
import * as gigService from '../services/gigService'

const newestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)

// Freelancers manage their own gigs here. The API's "my gigs" list is only
// ever the logged-in freelancer's, and it includes gigs they have removed.
// Removed gigs are hidden unless asked for, and cannot be edited again.
// The API still checks ownership on every create, update and delete.
function MyGigsPage() {
  const [gigs, setGigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [showRemoved, setShowRemoved] = useState(false)

  useEffect(() => {
    let cancelled = false

    gigService
      .listMyGigs()
      .then((data) => {
        if (!cancelled) setGigs([...data].sort(newestFirst))
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
  }, [])

  const activeGigs = gigs.filter((gig) => gig.isActive)
  const removedGigs = gigs.filter((gig) => !gig.isActive)

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

  // The API only hides a removed gig, so it stays in the list as inactive.
  const handleDelete = async (id) => {
    await gigService.deleteGig(id)
    setGigs((current) => current.map((gig) => (gig.id === id ? { ...gig, isActive: false } : gig)))
    setNotice('Your gig has been deleted. Existing bookings are not affected.')
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

      {!loading && !error && activeGigs.length === 0 && !creating && (
        <p className="muted">You have no live gigs. Choose New gig to add one.</p>
      )}

      {!loading && !error && activeGigs.length > 0 && (
        <div className="gig-grid">
          {activeGigs.map((gig) => (
            <ManageGigCard key={gig.id} gig={gig} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {!loading && !error && removedGigs.length > 0 && (
        <div className="removed-gigs">
          <button
            type="button"
            className="btn btn-secondary"
            aria-expanded={showRemoved}
            onClick={() => setShowRemoved(!showRemoved)}
          >
            {showRemoved ? 'Hide' : 'Show'} deleted gigs ({removedGigs.length})
          </button>

          {showRemoved && (
            <div className="gig-grid">
              {removedGigs.map((gig) => (
                <GigCard key={gig.id} gig={gig} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default MyGigsPage
