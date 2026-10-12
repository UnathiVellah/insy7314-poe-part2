import { hasErrors } from './validation'

// Rules for the create/edit gig form. They give users quick feedback only -
// the API validates everything again and has the final say. The limits match
// the API's gig rules.

export const TITLE_MIN = 5
export const TITLE_MAX = 100
export const DESCRIPTION_MIN = 20
export const DESCRIPTION_MAX = 2000
export const CATEGORY_MAX = 50
export const PRICE_MIN = 1
export const PRICE_MAX = 1000000

// The API stores category as free text (no fixed list), so these are just
// suggestions offered via a <datalist> - a freelancer can still type
// anything else that fits within CATEGORY_MAX.
export const CATEGORY_SUGGESTIONS = [
  'Design',
  'Writing & Translation',
  'Programming & Tech',
  'Video & Animation',
  'Music & Audio',
  'Business',
  'Other',
]

export const validateGigForm = ({ title, description, category, price }) => {
  const errors = {}

  const cleanTitle = title.trim()
  if (!cleanTitle) {
    errors.title = 'Title is required.'
  } else if (cleanTitle.length < TITLE_MIN) {
    errors.title = `Title must be at least ${TITLE_MIN} characters.`
  } else if (cleanTitle.length > TITLE_MAX) {
    errors.title = `Title must not exceed ${TITLE_MAX} characters.`
  }

  const cleanDescription = description.trim()
  if (!cleanDescription) {
    errors.description = 'Description is required.'
  } else if (cleanDescription.length < DESCRIPTION_MIN) {
    errors.description = `Description must be at least ${DESCRIPTION_MIN} characters.`
  } else if (cleanDescription.length > DESCRIPTION_MAX) {
    errors.description = `Description must not exceed ${DESCRIPTION_MAX} characters.`
  }

  if (!category.trim()) {
    errors.category = 'Category is required.'
  } else if (category.trim().length > CATEGORY_MAX) {
    errors.category = `Category must not exceed ${CATEGORY_MAX} characters.`
  }

  const text = String(price).trim()
  const amount = Number(text)

  if (text === '') {
    errors.price = 'Price is required.'
  } else if (!Number.isFinite(amount) || amount < PRICE_MIN) {
    errors.price = `Price must be a number of at least ${PRICE_MIN}.`
  } else if (amount > PRICE_MAX) {
    errors.price = `Price must not exceed ${PRICE_MAX.toLocaleString('en-ZA')}.`
  } else if (Math.round(amount * 100) / 100 !== amount) {
    errors.price = 'Price can have at most 2 decimal places.'
  }

  return errors
}

export { hasErrors }
