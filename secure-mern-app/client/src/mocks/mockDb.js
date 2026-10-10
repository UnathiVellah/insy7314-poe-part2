// In-browser stand-in for the gigs, bookings and transactions stores that the
// real API will provide. The data lives in memory and resets on page reload.
//
// Gig shape follows docs/API_CONTRACT.md:
//   { id, ownerId, title, description, price, createdAt }

const seedGigs = () => [
  {
    id: 'gig-seed-1',
    ownerId: 'mock-freelancer-1',
    title: 'Logo design',
    description: 'Three logo concepts and one round of revisions.',
    price: 500,
    createdAt: '2026-09-01T09:00:00.000Z',
  },
  {
    id: 'gig-seed-2',
    ownerId: 'mock-freelancer-1',
    title: 'Landing page copywriting',
    description: 'Clear, persuasive copy for a single landing page (up to 600 words).',
    price: 750,
    createdAt: '2026-09-03T11:30:00.000Z',
  },
  {
    id: 'gig-seed-3',
    ownerId: 'mock-freelancer-2',
    title: 'React bug fixing',
    description: 'Up to two hours of debugging and fixing issues in a React project.',
    price: 900,
    createdAt: '2026-09-05T14:15:00.000Z',
  },
  {
    id: 'gig-seed-4',
    ownerId: 'mock-freelancer-2',
    title: 'Social media pack',
    description: 'Ten branded post templates for Instagram and LinkedIn.',
    price: 650,
    createdAt: '2026-09-08T08:45:00.000Z',
  },
]

export const db = {
  gigs: seedGigs(),
  bookings: [],
  transactions: [],
}

// Puts the fake database back to its starting state (used by tests).
export const resetMockDb = () => {
  db.gigs = seedGigs()
  db.bookings = []
  db.transactions = []
}

let counter = 0

export const newId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  counter += 1
  return `mock-${Date.now()}-${counter}`
}
