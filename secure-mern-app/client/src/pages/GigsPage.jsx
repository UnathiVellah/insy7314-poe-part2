import { useEffect, useMemo, useState } from 'react'
import BookGigButton from '../components/BookGigButton'
import GigCard from '../components/GigCard'
import StatusMessage from '../components/StatusMessage'
import { useAuth } from '../context/useAuth'
import * as gigService from '../services/gigService'
import { SORT_OPTIONS, filterAndSortGigs } from '../utils/gigs'

const PAGE_SIZE = 12

function GigsPage() {
  const { user } = useAuth()
  const [gigs, setGigs] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [moreError, setMoreError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    let cancelled = false

    gigService
      .listGigs({ page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return
        setGigs(result.gigs)
        setPagination(result.pagination)
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

  const hasMore = pagination !== null && pagination.page < pagination.totalPages

  // The API hands out gigs a page at a time. A gig listed while the visitor
  // is browsing can push one onto the next page twice, so repeats are skipped.
  const handleLoadMore = async () => {
    setMoreError('')
    setLoadingMore(true)

    try {
      const result = await gigService.listGigs({ page: pagination.page + 1, limit: PAGE_SIZE })
      setGigs((current) => {
        const known = new Set(current.map((gig) => gig.id))
        return [...current, ...result.gigs.filter((gig) => !known.has(gig.id))]
      })
      setPagination(result.pagination)
    } catch (err) {
      setMoreError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

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
                {hasMore && ` loaded (${pagination.total} in total)`}
              </p>

              {visibleGigs.length === 0 ? (
                <p className="muted">
                  No gigs match your search.
                  {hasMore && ' Load more gigs to search further.'}
                </p>
              ) : (
                <div className="gig-grid">
                  {visibleGigs.map((gig) => (
                    <GigCard key={gig.id} gig={gig}>
                      {user.role === 'client' && <BookGigButton gig={gig} />}
                    </GigCard>
                  ))}
                </div>
              )}

              <StatusMessage type="error" message={moreError} />

              {hasMore && (
                <div className="load-more">
                  <button type="button" className="btn btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading...' : 'Load more gigs'}
                  </button>
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
