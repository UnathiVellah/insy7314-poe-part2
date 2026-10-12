import { apiRequest } from './api'
import { normalizeBooking } from './normalize'

// Every function resolves with bookings in the simple shape the pages use:
//   { id, gigId, clientId, freelancerId, amountCents, status, createdAt }
// A booking's status moves pending -> accepted -> completed, or pending -> cancelled.

/**
 * POST /api/bookings - clients only. The booking starts as "pending": the
 * freelancer has to accept it, and no payment is made yet.
 */
export const createBooking = async (gigId) => {
  const body = await apiRequest('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({ gigId }),
  })
  return normalizeBooking(body.data)
}

/** GET /api/bookings/mine - clients only: the bookings this client has made. */
export const listMyBookings = async () => {
  const body = await apiRequest('/api/bookings/mine')
  return body.data.map(normalizeBooking)
}

/** GET /api/bookings/freelancer - freelancers only: bookings on their gigs. */
export const listFreelancerBookings = async () => {
  const body = await apiRequest('/api/bookings/freelancer')
  return body.data.map(normalizeBooking)
}

/**
 * PATCH /api/bookings/:id/status - the API decides who may do what:
 *   freelancer: pending -> "accepted", then accepted -> "completed"
 *   client:     pending -> "cancelled"
 */
export const updateBookingStatus = async (id, status) => {
  const body = await apiRequest(`/api/bookings/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return normalizeBooking(body.data)
}
