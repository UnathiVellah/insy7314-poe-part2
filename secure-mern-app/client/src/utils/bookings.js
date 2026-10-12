// Helpers for the bookings page.
//
// A booking moves through these steps:
//   pending   - the client asked for it
//   accepted  - the freelancer agreed to do the work
//   completed - the freelancer finished it, so the client can now pay
//   cancelled - the client withdrew it while it was still pending
//
// A booking only holds a gigId, and payment is a separate record (a
// transaction) that points back at the booking. buildBookingRows joins them
// so the page can show the gig title and whether it has been paid.

const newestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)

/**
 * One row per booking, newest first.
 *   gigsById        - Map of gig id -> gig (a missing or null entry means the gig is gone)
 *   paidBookingIds  - Set of booking ids that have a payment
 */
export const buildBookingRows = (bookings, gigsById, paidBookingIds) =>
  bookings
    .map((booking) => {
      const gig = gigsById.get(booking.gigId)

      return {
        id: booking.id,
        // A gig can be removed after it was booked, so the title may be missing.
        gigTitle: gig ? gig.title : null,
        status: booking.status,
        createdAt: booking.createdAt,
        amountCents: booking.amountCents,
        paid: paidBookingIds.has(booking.id),
      }
    })
    .sort(newestFirst)

export const describePayment = (row) => {
  if (row.paid) return 'Paid (simulated)'
  if (row.status === 'completed') return 'Awaiting payment'
  if (row.status === 'cancelled') return '-'
  return 'Not due yet'
}

/**
 * The buttons a user can be offered on a booking row. These mirror the API's
 * rules so the page does not offer something that would be refused; the API
 * still checks every request.
 *   freelancer: accept a pending booking, then mark an accepted one completed
 *   client:     cancel a pending booking, pay for a completed one (once)
 */
export const availableActions = (row, role) => {
  if (role === 'freelancer') {
    if (row.status === 'pending') return ['accept']
    if (row.status === 'accepted') return ['complete']
  }

  if (role === 'client') {
    if (row.status === 'pending') return ['cancel']
    if (row.status === 'completed' && !row.paid) return ['pay']
  }

  return []
}
