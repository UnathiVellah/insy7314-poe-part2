// Helpers for the bookings page.
//
// The API returns bookings, gigs and transactions as three separate lists.
// A booking only holds a gigId, and its payment lives in a transaction that
// points back at the booking. buildBookingRows joins them into one row per
// booking so the page can show the gig title and the amount together.

export const buildBookingRows = (bookings, gigs, transactions) => {
  const gigsById = new Map(gigs.map((gig) => [gig.id, gig]))
  const transactionsByBooking = new Map(
    transactions.map((transaction) => [transaction.bookingId, transaction]),
  )

  return bookings
    .map((booking) => {
      const gig = gigsById.get(booking.gigId)
      const transaction = transactionsByBooking.get(booking.id)

      return {
        id: booking.id,
        // A gig can be deleted after it was booked, so the title may be missing.
        gigTitle: gig ? gig.title : null,
        status: booking.status,
        createdAt: booking.createdAt,
        amount: transaction ? transaction.amount : null,
        paymentStatus: transaction ? transaction.status : null,
      }
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export const describePayment = (status) => {
  if (status === 'simulated-paid') {
    return 'Paid (simulated)'
  }
  return status || '-'
}
