// Display helpers shared by the gig, booking and income screens.
// Amounts are in South African rand (ZAR), as set out in the API contract.

const priceFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
})

export const formatPrice = (amount) => priceFormatter.format(amount)

// Turns an ISO timestamp such as "2026-09-20T10:00:00.000Z" into "20 Sept 2026".
// Returns an empty string for a missing or invalid date instead of "Invalid Date".
export const formatDate = (isoString) => {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}
