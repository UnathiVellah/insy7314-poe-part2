// Shows a success or error message. Text is rendered as plain text (React
// escapes it), never as HTML.
function StatusMessage({ type = 'error', message }) {
  if (!message) {
    return null
  }

  return (
    <p className={`status status-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {message}
    </p>
  )
}

export default StatusMessage