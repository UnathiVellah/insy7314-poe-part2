// A fake version of the gig, booking and transaction endpoints in
// docs/API_CONTRACT.md. It follows the same rules as the real API (roles,
// ownership, status codes and error messages) so the pages behave the same
// way when we switch to the real thing.
//
// Every function resolves with the same value the matching service returns,
// i.e. the `data` part of the API response.

import { ApiError, getSavedUser } from '../services/api'
import { db, newId } from './mockDb'

const FORBIDDEN = 'You do not have permission to perform this action'
const NOT_FOUND = 'Resource not found'

const currentUser = () => {
  const user = getSavedUser()
  if (!user) {
    throw new ApiError('Authentication token required', 401)
  }
  return user
}

const requireRole = (user, ...roles) => {
  if (!roles.includes(user.role)) {
    throw new ApiError(FORBIDDEN, 403)
  }
}

const cleanGigInput = (input) => {
  const { title, description, price } = input || {}

  if (typeof title !== 'string' || typeof description !== 'string' || !title.trim() || !description.trim()) {
    throw new ApiError('Title, description and price are required', 400)
  }

  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    throw new ApiError('Price must be a positive number', 400)
  }

  return { title: title.trim(), description: description.trim(), price }
}

// A gig the caller does not own looks exactly like a gig that does not exist.
const findOwnedGig = (id, user) => {
  const gig = db.gigs.find((item) => item.id === id)
  if (!gig || gig.ownerId !== user.id) {
    throw new ApiError(NOT_FOUND, 404)
  }
  return gig
}

/* ---------- Gigs ---------- */

export const listGigs = async () => {
  currentUser()
  return db.gigs.map((gig) => ({ ...gig }))
}

export const getGig = async (id) => {
  currentUser()
  const gig = db.gigs.find((item) => item.id === id)
  if (!gig) {
    throw new ApiError(NOT_FOUND, 404)
  }
  return { ...gig }
}

export const createGig = async (input) => {
  const user = currentUser()
  requireRole(user, 'freelancer')

  const gig = {
    id: newId(),
    ownerId: user.id,
    ...cleanGigInput(input),
    createdAt: new Date().toISOString(),
  }
  db.gigs.push(gig)
  return { ...gig }
}

export const updateGig = async (id, input) => {
  const user = currentUser()
  requireRole(user, 'freelancer')

  const gig = findOwnedGig(id, user)
  Object.assign(gig, cleanGigInput(input))
  return { ...gig }
}

export const deleteGig = async (id) => {
  const user = currentUser()
  requireRole(user, 'freelancer')

  const gig = findOwnedGig(id, user)
  db.gigs = db.gigs.filter((item) => item.id !== gig.id)
  return { id: gig.id }
}

/* ---------- Bookings ---------- */

// For a booking, ownerId is the client. For the transaction it creates,
// ownerId is the freelancer who earned the income (see the contract).
export const createBooking = async (gigId) => {
  const user = currentUser()
  requireRole(user, 'client')

  const gig = db.gigs.find((item) => item.id === gigId)
  if (!gig) {
    throw new ApiError(NOT_FOUND, 404)
  }

  const createdAt = new Date().toISOString()

  const booking = {
    id: newId(),
    ownerId: user.id,
    gigId: gig.id,
    freelancerId: gig.ownerId,
    status: 'confirmed',
    createdAt,
  }

  const transaction = {
    id: newId(),
    ownerId: gig.ownerId,
    bookingId: booking.id,
    clientId: user.id,
    freelancerId: gig.ownerId,
    amount: gig.price,
    status: 'simulated-paid',
    createdAt,
  }

  db.bookings.push(booking)
  db.transactions.push(transaction)

  return { booking: { ...booking }, transaction: { ...transaction } }
}

export const listBookings = async () => {
  const user = currentUser()

  let bookings = []
  if (user.role === 'client') {
    bookings = db.bookings.filter((item) => item.ownerId === user.id)
  } else if (user.role === 'freelancer') {
    bookings = db.bookings.filter((item) => item.freelancerId === user.id)
  } else if (user.role === 'admin') {
    bookings = db.bookings
  }

  return bookings.map((item) => ({ ...item }))
}

/* ---------- Transactions and income ---------- */

export const listTransactions = async () => {
  const user = currentUser()

  let transactions = []
  if (user.role === 'client') {
    transactions = db.transactions.filter((item) => item.clientId === user.id)
  } else if (user.role === 'freelancer') {
    transactions = db.transactions.filter((item) => item.ownerId === user.id)
  } else if (user.role === 'admin') {
    transactions = db.transactions
  }

  return transactions.map((item) => ({ ...item }))
}

export const getIncome = async () => {
  const user = currentUser()
  requireRole(user, 'freelancer')

  const transactions = db.transactions.filter((item) => item.ownerId === user.id)
  const totalIncome = transactions.reduce((sum, item) => sum + item.amount, 0)

  return {
    totalIncome,
    transactionCount: transactions.length,
    transactions: transactions.map((item) => ({ ...item })),
  }
}
