import { apiRequest } from './api'
import { normalizeGig } from './normalize'

// Every function resolves with gigs in the simple shape the pages use:
//   { id, ownerId, title, description, category, price, isActive, createdAt }
// (price is in rand). See normalize.js.

const send = (path, method, payload) =>
  apiRequest(path, { method, body: JSON.stringify(payload) })

const gigPath = (id) => `/api/gigs/${encodeURIComponent(id)}`

/**
 * GET /api/gigs - the public list of active gigs, one page at a time (the API
 * allows at most 50 per page). Resolves with { gigs, pagination }, where
 * pagination is { page, limit, total, totalPages }.
 */
export const listGigs = async ({ page = 1, limit = 12 } = {}) => {
  const body = await apiRequest(`/api/gigs?page=${page}&limit=${limit}`)
  return { gigs: body.data.map(normalizeGig), pagination: body.pagination }
}

/**
 * GET /api/gigs/mine - freelancers only. Every gig the freelancer has made,
 * including ones they removed (those have isActive: false).
 */
export const listMyGigs = async () => {
  const body = await apiRequest('/api/gigs/mine')
  return body.data.map(normalizeGig)
}

/** GET /api/gigs/:id - one active gig. */
export const getGig = async (id) => {
  const body = await apiRequest(gigPath(id))
  return normalizeGig(body.data)
}

/**
 * Looks up several gigs by id, for showing the title of each booking. A gig
 * that has been removed answers 404, so it comes back as null instead of
 * stopping the others. Resolves with a Map of id -> gig (or null).
 */
export const loadGigsById = async (ids) => {
  const unique = [...new Set(ids)]

  const found = await Promise.all(unique.map((id) => getGig(id).catch(() => null)))

  return new Map(unique.map((id, index) => [id, found[index]]))
}

/**
 * POST /api/gigs - freelancers only. Takes { title, description, category, price }.
 */
export const createGig = async (gig) => {
  const body = await send('/api/gigs', 'POST', gig)
  return normalizeGig(body.data)
}

/** PUT /api/gigs/:id - the owning freelancer only. */
export const updateGig = async (id, gig) => {
  const body = await send(gigPath(id), 'PUT', gig)
  return normalizeGig(body.data)
}

/**
 * DELETE /api/gigs/:id - the owning freelancer only. The API only hides the
 * gig (it stays in "my gigs" with isActive: false), so bookings made on it
 * keep working.
 */
export const deleteGig = async (id) => {
  await apiRequest(gigPath(id), { method: 'DELETE' })
}
