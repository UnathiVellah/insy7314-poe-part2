import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusMessage from '../components/StatusMessage'
import { useAuth } from '../context/useAuth'
import * as bookingService from '../services/bookingService'
import * as gigService from '../services/gigService'
import * as transactionService from '../services/transactionService'
import { buildBookingRows, describePayment } from '../utils/bookings'
import { formatDate, formatPrice } from '../utils/format'

// The API decides which bookings each role may see (a client sees their own,
// a freelancer sees bookings on their gigs, an admin sees all), so the page
// shows whatever it is given and only changes the wording per role.
const HEADINGS = {
  client: {
    title: 'My bookings',
    intro: 'The gigs you have booked and what each one cost.',
  },
  freelancer: {
    title: 'Bookings on my gigs',
    intro: 'Clients who have booked your gigs and the income each booking earned.',
  },
  admin: {
    title: 'All bookings',
    intro: 'Every booking made on the platform.',
  },
}

function BookingsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([
      bookingService.listBookings(),
      gigService.listGigs(),
      transactionService.listTransactions(),
    ])
      .then(([bookings, gigs, transactions]) => {
        if (!cancelled) setRows(buildBookingRows(bookings, gigs, transactions))
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

  const heading = HEADINGS[user.role] || HEADINGS.client

  return (
    <section>
      <div className="page-header">
        <h1>{heading.title}</h1>
        <p>{heading.intro}</p>
      </div>

      <StatusMessage type="error" message={error} />

      {loading && <p role="status">Loading bookings...</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="muted">
          You have no bookings yet.{' '}
          {user.role === 'client' && <Link to="/gigs">Browse gigs to make your first booking.</Link>}
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Gig</th>
                <th scope="col">Booked on</th>
                <th scope="col">Status</th>
                <th scope="col">Amount</th>
                <th scope="col">Payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.gigTitle ?? 'Gig no longer available'}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>
                    <span className="badge">{row.status}</span>
                  </td>
                  <td className="amount">{row.amount === null ? '-' : formatPrice(row.amount)}</td>
                  <td>{describePayment(row.paymentStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default BookingsPage
