import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BookingActions from '../components/BookingActions'
import StatusMessage from '../components/StatusMessage'
import { useAuth } from '../context/useAuth'
import * as bookingService from '../services/bookingService'
import * as gigService from '../services/gigService'
import * as transactionService from '../services/transactionService'
import { buildBookingRows, describePayment } from '../utils/bookings'
import { formatCents, formatDate } from '../utils/format'

// Each role sees a different slice of the bookings, and the API only ever
// returns the logged-in user's own. There is no "all bookings" list, so an
// admin has nothing to load here.
const HEADINGS = {
  client: {
    title: 'My bookings',
    intro: 'The gigs you have booked. Once a freelancer completes the work, you can pay for it here.',
  },
  freelancer: {
    title: 'Bookings on my gigs',
    intro: 'Accept bookings, mark them completed when the work is done, and see which have been paid.',
  },
  admin: {
    title: 'Bookings',
    intro: 'Bookings belong to the client and freelancer involved.',
  },
}

const SUCCESS_MESSAGES = {
  accept: () => 'Booking accepted.',
  complete: () => 'Booking marked as completed. The client can now pay for it.',
  cancel: () => 'Booking cancelled.',
  pay: (row) => `Payment of ${formatCents(row.amountCents)} recorded (simulated).`,
}

// The booking status each button asks the API to move to.
const NEW_STATUS = { accept: 'accepted', complete: 'completed', cancel: 'cancelled' }

// Loads the bookings for a role, with the gig title and payment state for each.
//   client:     their bookings + their payments; gig titles looked up one by one
//   freelancer: bookings on their gigs + their income; gig titles from their own gigs
const loadRows = async (role) => {
  if (role === 'client') {
    const [bookings, transactions] = await Promise.all([
      bookingService.listMyBookings(),
      transactionService.listMyTransactions(),
    ])
    const gigsById = await gigService.loadGigsById(bookings.map((booking) => booking.gigId))
    return buildBookingRows(bookings, gigsById, new Set(transactions.map((item) => item.bookingId)))
  }

  if (role === 'freelancer') {
    const [bookings, income, gigs] = await Promise.all([
      bookingService.listFreelancerBookings(),
      transactionService.getIncome(),
      gigService.listMyGigs(),
    ])
    const gigsById = new Map(gigs.map((gig) => [gig.id, gig]))
    return buildBookingRows(bookings, gigsById, new Set(income.transactions.map((item) => item.bookingId)))
  }

  return []
}

function BookingsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    loadRows(user.role)
      .then((loaded) => {
        if (mounted.current) setRows(loaded)
      })
      .catch((err) => {
        if (mounted.current) setError(err.message)
      })
      .finally(() => {
        if (mounted.current) setLoading(false)
      })

    return () => {
      mounted.current = false
    }
  }, [user.role])

  // Runs one button press, then reloads the list so the page always shows what
  // the API now says - even when the press was refused (for example because
  // the other person had just changed the booking).
  const handleAction = async (row, action) => {
    setNotice('')
    setActionError('')

    try {
      if (action === 'pay') {
        await transactionService.payBooking(row.id)
      } else {
        await bookingService.updateBookingStatus(row.id, NEW_STATUS[action])
      }
      if (mounted.current) setNotice(SUCCESS_MESSAGES[action](row))
    } catch (err) {
      if (mounted.current) setActionError(err.message)
    }

    try {
      const refreshed = await loadRows(user.role)
      if (mounted.current) setRows(refreshed)
    } catch (err) {
      if (mounted.current) setActionError(err.message)
    }
  }

  const heading = HEADINGS[user.role] || HEADINGS.client
  const isAdmin = user.role === 'admin'

  return (
    <section>
      <div className="page-header">
        <h1>{heading.title}</h1>
        <p>{heading.intro}</p>
      </div>

      <StatusMessage type="error" message={error} />
      <StatusMessage type="error" message={actionError} />
      <StatusMessage type="success" message={notice} />

      {isAdmin && (
        <p className="muted">
          There is no platform-wide bookings list, so there is nothing to show here. Clients and freelancers see
          their own bookings on this page.
        </p>
      )}

      {!isAdmin && loading && <p role="status">Loading bookings...</p>}

      {!isAdmin && !loading && !error && rows.length === 0 && (
        <p className="muted">
          {user.role === 'freelancer' ? (
            'No clients have booked your gigs yet.'
          ) : (
            <>
              You have no bookings yet. <Link to="/gigs">Browse gigs to make your first booking.</Link>
            </>
          )}
        </p>
      )}

      {!isAdmin && !loading && !error && rows.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Gig</th>
                <th scope="col">Booked on</th>
                <th scope="col">Status</th>
                <th scope="col">Amount</th>
                <th scope="col">Payment</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.gigTitle ?? 'Gig no longer available'}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>
                    <span className={`badge badge-${row.status}`}>{row.status}</span>
                  </td>
                  <td className="amount">{formatCents(row.amountCents)}</td>
                  <td>{describePayment(row)}</td>
                  <td>
                    <BookingActions row={row} role={user.role} onAction={handleAction} />
                  </td>
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
