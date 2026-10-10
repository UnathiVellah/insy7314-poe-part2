import { useEffect, useMemo, useState } from 'react'
import BookGigButton from '../components/BookGigButton'
import GigCard from '../components/GigCard'
import StatusMessage from '../components/StatusMessage'
import { useAuth } from '../context/useAuth'
import * as gigService from '../services/gigService'
import { SORT_OPTIONS, filterAndSortGigs } from '../utils/gigs'

function GigsPage() {
  const { user } = useAuth()
  const [gigs, setGigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    let cancelled = false

    gigService
      .listGigs()
      .then((data) => {
        if (!cancelled) setGigs(data)
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

  const visibleGigs = useMemo(() => filterAndSortGigs(gigs, { query, sort }), [gigs, query, sort])

  return (
    <section>
      <div className="page-header">
        <h1>Browse gigs</h1>
        <p>Find a freelancer for your next project.</p>
      </div>

      <StatusMessage type="error" message={error} />

      {loading && <p role="status">Loading gigs...</p>}

      {!loading && !error && (
        <>
          <div className="toolbar">
            <div className="form-field">
              <label htmlFor="gig-search">Search gigs</label>
              <input
                id="gig-search"
                type="search"
                placeholder="Search by title or description"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="gig-sort">Sort by</label>
              <select id="gig-sort" value={sort} onChange={(event) => setSort(event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {gigs.length === 0 ? (
            <p className="muted">There are no gigs yet. Check back soon.</p>
          ) : (
            <>
              <p className="result-count" aria-live="polite">
                Showing {visibleGigs.length} of {gigs.length} gigs
              </p>

              {visibleGigs.length === 0 ? (
                <p className="muted">No gigs match your search.</p>
              ) : (
                <div className="gig-grid">
                  {visibleGigs.map((gig) => (
                    <GigCard key={gig.id} gig={gig}>
                      {user.role === 'client' && <BookGigButton gig={gig} />}
                    </GigCard>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}

export default GigsPage
