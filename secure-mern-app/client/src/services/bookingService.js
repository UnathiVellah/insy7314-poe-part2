import { apiRequest } from './api'
import * as mockApi from '../mocks/mockApi'

const mocksEnabled = () => import.meta.env.VITE_USE_MOCKS === 'true'

/**
 * POST /api/bookings - clients only.
 * Resolves with { booking, transaction }.
 */
export const createBooking = async (gigId) => {
  if (mocksEnabled()) return mockApi.createBooking(gigId)

  const body = await apiRequest('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({ gigId }),
  })
  return body.data
}

/**
 * GET /api/bookings
 * Client: own bookings. Freelancer: bookings on their gigs. Admin: all.
 */
export const listBookings = async () => {
  if (mocksEnabled()) return mockApi.listBookings()
  return (await apiRequest('/api/bookings')).data
}
