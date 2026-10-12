import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as bookingService from '../services/bookingService'
import { formatPrice } from '../utils/format'
import StatusMessage from './StatusMessage'

// The booking flow for one gig, in place on its card:
//   idle -> confirming -> submitting -> done
// Booking asks for a confirmation first, and the buttons are disabled while
// the request is in flight so a double click cannot book the gig twice.
//
// Booking only sends a request: the freelancer has to accept it and complete
// the work, and the client then pays (simulated) from the bookings page. Only
// clients can book - the API enforces that, this button is only shown to them
// for convenience.
function BookGigButton({ gig }) {
  const [step, setStep] = useState('idle')
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setError('')
    setStep('submitting')

    try {
      await bookingService.createBooking(gig.id)
      setStep('done')
    } catch (err) {
      setError(err.message)
      setStep('confirming')
    }
  }

  const handleCancel = () => {
    setError('')
    setStep('idle')
  }

  if (step === 'done') {
    return (
      <div className="booking-confirm">
        <StatusMessage
          type="success"
          message="Booking requested. The freelancer needs to accept it before work starts."
        />
        <Link to="/bookings">View my bookings</Link>
      </div>
    )
  }

  if (step === 'idle') {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setStep('confirming')}>
        Book this gig
      </button>
    )
  }

  const submitting = step === 'submitting'

  return (
    <div className="booking-confirm">
      <p>
        Book <strong>{gig.title}</strong> for {formatPrice(gig.price)}?
      </p>
      <p className="muted">You pay after the freelancer completes the work. Payment is simulated, so no money moves.</p>

      <StatusMessage type="error" message={error} />

      <div className="button-row">
        <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={submitting}>
          {submitting ? 'Booking...' : 'Confirm booking'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default BookGigButton
