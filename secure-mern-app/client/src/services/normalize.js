// The API speaks in MongoDB terms: _id, freelancer, client, agreedPriceCents.
// These functions turn what the API sends into the simpler shapes the pages
// use, so no page has to know the API's field names.
//
//   gig         { id, ownerId, title, description, category, price, isActive, createdAt }
//   booking     { id, gigId, clientId, freelancerId, amountCents, status, createdAt }
//   transaction { id, bookingId, clientId, freelancerId, amountCents, status, createdAt }
//   income      { totalIncomeCents, completedPayments, currency, transactions }
//   user        { id, fullName, email, role }
//
// Money on bookings and transactions is always in whole cents (2000 = R20.00).
// A gig's price is in rand, because that is how the API stores it.
//
// Text (names, gig titles and so on) is passed through exactly as the API sent
// it. The API stores what the user typed, and React encodes text when it
// draws it on the page, so nothing needs decoding or escaping here.

export const normalizeUser = (raw) => ({
  id: raw.id,
  fullName: raw.fullName,
  email: raw.email,
  role: raw.role,
})

export const normalizeGig = (raw) => ({
  id: raw._id,
  ownerId: raw.freelancer,
  title: raw.title,
  description: raw.description,
  category: raw.category,
  price: raw.price,
  // The public list leaves isActive out because it only ever holds active gigs.
  isActive: raw.isActive !== false,
  createdAt: raw.createdAt,
})

export const normalizeBooking = (raw) => ({
  id: raw._id,
  gigId: raw.gig,
  clientId: raw.client,
  freelancerId: raw.freelancer,
  amountCents: raw.agreedPriceCents,
  status: raw.status,
  createdAt: raw.createdAt,
})

export const normalizeTransaction = (raw) => ({
  id: raw._id,
  bookingId: raw.booking,
  // The income summary only lists the booking, amount and date of each payment.
  clientId: raw.client ?? null,
  freelancerId: raw.freelancer ?? null,
  amountCents: raw.amountCents,
  status: raw.status,
  createdAt: raw.createdAt,
})

export const normalizeIncome = (raw) => ({
  totalIncomeCents: raw.totalIncomeCents,
  completedPayments: raw.completedPayments,
  currency: raw.currency,
  transactions: (raw.transactions || []).map(normalizeTransaction),
})
