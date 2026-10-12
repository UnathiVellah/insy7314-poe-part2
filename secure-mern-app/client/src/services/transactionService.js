import { apiRequest } from './api'
import { normalizeIncome, normalizeTransaction } from './normalize'

// Payments are simulated: no money moves, but each payment is recorded.
// Amounts are in whole cents (2000 = R20.00).

/**
 * POST /api/transactions - clients only. Pays for a booking that the freelancer
 * has completed. A booking can only be paid once.
 */
export const payBooking = async (bookingId) => {
  const body = await apiRequest('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({ bookingId }),
  })
  return normalizeTransaction(body.data)
}

/** GET /api/transactions/mine - clients only: the payments this client has made. */
export const listMyTransactions = async () => {
  const body = await apiRequest('/api/transactions/mine')
  return body.data.map(normalizeTransaction)
}

/**
 * GET /api/transactions/income - freelancers only.
 * Resolves with { totalIncomeCents, completedPayments, currency, transactions }.
 */
export const getIncome = async () => {
  const body = await apiRequest('/api/transactions/income')
  return normalizeIncome(body.data)
}
