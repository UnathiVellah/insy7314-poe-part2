import { apiRequest } from './api'
import * as mockApi from '../mocks/mockApi'

// Set VITE_USE_MOCKS=true in .env to use the built-in fake data instead of the
// real API. Checked on every call so it is easy to switch and to test.
const mocksEnabled = () => import.meta.env.VITE_USE_MOCKS === 'true'

const send = (path, method, payload) =>
  apiRequest(path, { method, body: JSON.stringify(payload) })

/** GET /api/gigs */
export const listGigs = async () => {
  if (mocksEnabled()) return mockApi.listGigs()
  return (await apiRequest('/api/gigs')).data
}

/** GET /api/gigs/:id */
export const getGig = async (id) => {
  if (mocksEnabled()) return mockApi.getGig(id)
  return (await apiRequest(`/api/gigs/${encodeURIComponent(id)}`)).data
}

/** POST /api/gigs - freelancers only. Takes { title, description, price }. */
export const createGig = async (gig) => {
  if (mocksEnabled()) return mockApi.createGig(gig)
  return (await send('/api/gigs', 'POST', gig)).data
}

/** PUT /api/gigs/:id - the owning freelancer only. */
export const updateGig = async (id, gig) => {
  if (mocksEnabled()) return mockApi.updateGig(id, gig)
  return (await send(`/api/gigs/${encodeURIComponent(id)}`, 'PUT', gig)).data
}

/** DELETE /api/gigs/:id - the owning freelancer only. */
export const deleteGig = async (id) => {
  if (mocksEnabled()) return mockApi.deleteGig(id)
  return (await apiRequest(`/api/gigs/${encodeURIComponent(id)}`, { method: 'DELETE' })).data
}
