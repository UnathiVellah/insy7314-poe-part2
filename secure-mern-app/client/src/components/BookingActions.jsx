import { useState } from 'react'
import { availableActions } from '../utils/bookings'
import { formatCents } from '../utils/format'

const LABELS = {
  accept: 'Accept',
  complete: 'Mark completed',
  cancel: 'Cancel booking',
  pay: 'Pay (simulated)',
}

// What each action asks before it goes ahead. Accepting is a single click; the
// others cannot be undone (or move money, in the simulation), so they ask first.
const CONFIRMATIONS = {
  complete: {
    question: (name) => `Mark ${name} as completed? The client will then be able to pay for it.`,
    confirm: 'Yes, mark completed',
    back: 'Not yet',
  },
  cancel: {
    question: (name) => `Cancel your booking for ${name}?`,
    confirm: 'Yes, cancel booking',
    back: 'Keep booking',
    danger: true,
  },
  pay: {
    question: (name, row) =>
      `Pay ${formatCents(row.amountCents)} for ${name}? Payment is simulated, so no money moves.`,
    confirm: 'Pay now',
    back: 'Not now',
  },
}

// The buttons for one booking, based on who is looking at it and where the
// booking is up to (see availableActions). The API makes the final decision
// on every request - these buttons only avoid offering what would be refused.
//
// onAction(row, action) is async and supplied by the page. It handles its own
// errors, so this component only has to wait for it to finish.
function BookingActions({ row, role, onAction }) {
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)

  const actions = availableActions(row, role)
  const name = row.gigTitle ?? 'this gig'

  const run = async (action) => {
    setBusy(true)
    await onAction(row, action)
    setBusy(false)
    setConfirming(null)
  }

  if (confirming && actions.includes(confirming)) {
    const copy = CONFIRMATIONS[confirming]

    return (
      <div className="booking-confirm">
        <p>{copy.question(name, row)}</p>

        <div className="button-row">
          <button
            type="button"
            className={`btn ${copy.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => run(confirming)}
            disabled={busy}
          >
            {busy ? 'Working...' : copy.confirm}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirming(null)} disabled={busy}>
            {copy.back}
          </button>
        </div>
      </div>
    )
  }

  if (actions.length === 0) {
    return <span className="muted">-</span>
  }

  return (
    <div className="button-row">
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          className={action === 'pay' ? 'btn btn-primary' : 'btn btn-secondary'}
          aria-label={`${LABELS[action]}: ${name}`}
          disabled={busy}
          onClick={() => (CONFIRMATIONS[action] ? setConfirming(action) : run(action))}
        >
          {busy ? 'Working...' : LABELS[action]}
        </button>
      ))}
    </div>
  )
}

export default BookingActions
