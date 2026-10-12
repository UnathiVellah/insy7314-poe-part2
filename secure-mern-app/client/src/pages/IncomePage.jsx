import { useEffect, useState } from 'react'
import IncomeChart from '../components/IncomeChart'
import StatCard from '../components/StatCard'
import StatusMessage from '../components/StatusMessage'
import * as bookingService from '../services/bookingService'
import * as gigService from '../services/gigService'
import * as transactionService from '../services/transactionService'
import { formatCents, formatDate } from '../utils/format'
import { averageIncomeCents, buildIncomeRows, groupIncomeByMonth } from '../utils/income'

// Where a freelancer sees the money their gigs have earned. The figures come
// from the API's income summary, which only ever covers the logged-in
// freelancer and only counts bookings the client has paid for. Payments are
// simulated, so these are records, not real money.
function IncomePage() {
  const [income, setIncome] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([
      transactionService.getIncome(),
      bookingService.listFreelancerBookings(),
      gigService.listMyGigs(),
    ])
      .then(([summary, bookings, gigs]) => {
        if (cancelled) return
        setIncome(summary)
        setRows(buildIncomeRows(summary.transactions, bookings, gigs))
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

  const hasIncome = income !== null && income.completedPayments > 0

  return (
    <section>
      <div className="page-header">
        <h1>Income</h1>
        <p>What your gigs have earned from paid bookings. Payments are simulated.</p>
      </div>

      <StatusMessage type="error" message={error} />

      {loading && <p role="status">Loading your income...</p>}

      {!loading && !error && income && (
        <>
          <div className="stat-grid">
            <StatCard label="Total income" value={formatCents(income.totalIncomeCents)} />
            <StatCard
              label="Paid bookings"
              value={String(income.completedPayments)}
              hint="Bookings a client has paid for"
            />
            <StatCard
              label="Average per booking"
              value={formatCents(averageIncomeCents(income))}
              hint={hasIncome ? undefined : 'Appears after your first payment'}
            />
          </div>

          {!hasIncome && (
            <p className="muted">
              You have not earned anything yet. Income appears here once a client has booked one of your gigs, you
              have completed the work, and the client has paid.
            </p>
          )}

          {hasIncome && (
            <>
              <section className="income-section">
                <h2>Income by month</h2>
                <div className="card chart-card">
                  <IncomeChart months={groupIncomeByMonth(income.transactions)} />
                </div>
              </section>

              <section className="income-section">
                <h2>Earnings</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Gig</th>
                        <th scope="col">Paid on</th>
                        <th scope="col">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.gigTitle ?? 'Gig no longer available'}</td>
                          <td>{formatDate(row.createdAt)}</td>
                          <td className="amount">{formatCents(row.amountCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </section>
  )
}

export default IncomePage
