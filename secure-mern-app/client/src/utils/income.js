// Helpers for the freelancer income page.
//
// The API's income summary lists transactions, and each transaction only
// knows its bookingId. A booking knows its gigId. These helpers join the three
// lists so the page can show which gig earned what, and group the money by
// month for the chart.

export const averageIncome = (income) =>
  income.transactionCount > 0 ? income.totalIncome / income.transactionCount : 0

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const monthLabel = (key) => {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })
}

/**
 * Adds up income per calendar month, oldest first, keeping only the most
 * recent `maxMonths` months that have income. Months with no income are not
 * listed.
 */
export const groupIncomeByMonth = (transactions, maxMonths = 6) => {
  const totals = new Map()

  for (const transaction of transactions) {
    const date = new Date(transaction.createdAt)
    if (Number.isNaN(date.getTime())) continue

    const key = monthKey(date)
    totals.set(key, (totals.get(key) || 0) + transaction.amount)
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-maxMonths)
    .map(([key, total]) => ({ key, label: monthLabel(key), total }))
}

/**
 * One row per transaction with the title of the gig that earned it, newest
 * first. The title is null when the booking or its gig no longer exists.
 */
export const buildIncomeRows = (transactions, bookings, gigs) => {
  const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]))
  const gigsById = new Map(gigs.map((gig) => [gig.id, gig]))

  return transactions
    .map((transaction) => {
      const booking = bookingsById.get(transaction.bookingId)
      const gig = booking ? gigsById.get(booking.gigId) : undefined

      return {
        id: transaction.id,
        gigTitle: gig ? gig.title : null,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
      }
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}
