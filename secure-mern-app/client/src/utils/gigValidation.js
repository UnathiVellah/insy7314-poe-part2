import { hasErrors } from './validation'

// Rules for the create/edit gig form. They give users quick feedback only -
// the API validates everything again and has the final say.

export const TITLE_MAX = 100
export const DESCRIPTION_MAX = 1000
export const PRICE_MAX = 1000000

export const validateGigForm = ({ title, description, price }) => {
  const errors = {}

  if (!title.trim()) {
    errors.title = 'Title is required.'
  } else if (title.trim().length > TITLE_MAX) {
    errors.title = `Title must not exceed ${TITLE_MAX} characters.`
  }

  if (!description.trim()) {
    errors.description = 'Description is required.'
  } else if (description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Description must not exceed ${DESCRIPTION_MAX} characters.`
  }

  const text = String(price).trim()
  const amount = Number(text)

  if (text === '') {
    errors.price = 'Price is required.'
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.price = 'Price must be a number greater than 0.'
  } else if (amount > PRICE_MAX) {
    errors.price = `Price must not exceed ${PRICE_MAX.toLocaleString('en-ZA')}.`
  } else if (Math.round(amount * 100) / 100 !== amount) {
    errors.price = 'Price can have at most 2 decimal places.'
  }

  return errors
}

export { hasErrors }
