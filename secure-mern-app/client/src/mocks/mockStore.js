// The data behind the fake server (see mockServer.js). It lives in memory in
// the browser and starts again from these seed gigs on every page reload.
//
// Records use the same field names the real API returns (_id, freelancer,
// agreedPriceCents, ...), so the pages see exactly what they would from the
// real thing.

const SEED_FREELANCER_1 = '65f0000000000000000000f1'
const SEED_FREELANCER_2 = '65f0000000000000000000f2'

const seedGigs = () => [
  {
    _id: '65f0000000000000000000a1',
    title: 'Logo design',
    description: 'Three logo concepts and one round of revisions.',
    category: 'Design',
    price: 500,
    freelancer: SEED_FREELANCER_1,
    isActive: true,
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
  },
  {
    _id: '65f0000000000000000000a2',
    title: 'Landing page copywriting',
    description: 'Clear, persuasive copy for a single landing page (up to 600 words).',
    category: 'Writing & Translation',
    price: 750,
    freelancer: SEED_FREELANCER_1,
    isActive: true,
    createdAt: '2026-09-03T11:30:00.000Z',
    updatedAt: '2026-09-03T11:30:00.000Z',
  },
  {
    _id: '65f0000000000000000000a3',
    title: 'React bug fixing',
    description: 'Up to two hours of debugging and fixing issues in a React project.',
    category: 'Programming & Tech',
    price: 900,
    freelancer: SEED_FREELANCER_2,
    isActive: true,
    createdAt: '2026-09-05T14:15:00.000Z',
    updatedAt: '2026-09-05T14:15:00.000Z',
  },
  {
    _id: '65f0000000000000000000a4',
    title: 'Social media pack',
    description: 'Ten branded post templates for Instagram and LinkedIn.',
    category: 'Business',
    price: 650,
    freelancer: SEED_FREELANCER_2,
    isActive: true,
    createdAt: '2026-09-08T08:45:00.000Z',
    updatedAt: '2026-09-08T08:45:00.000Z',
  },
]

export const store = {
  gigs: seedGigs(),
  bookings: [],
  transactions: [],
}

// Puts the fake data back to its starting state (used by tests).
export const resetMockStore = () => {
  store.gigs = seedGigs()
  store.bookings = []
  store.transactions = []
}

// A 24-character hexadecimal id, the same shape as a MongoDB ObjectId.
export const newObjectId = () => {
  const bytes = new Uint8Array(12)

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
