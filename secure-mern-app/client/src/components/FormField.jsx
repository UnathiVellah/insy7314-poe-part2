// A label, an input and an optional error message, wired together for
// accessibility (aria-invalid / aria-describedby). Pass as="textarea" to get a
// multi-line field instead of a single-line input.
function FormField({ as: Control = 'input', id, label, error, ...inputProps }) {
  const errorId = `${id}-error`

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <Control
        id={id}
        name={id}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}

export default FormField