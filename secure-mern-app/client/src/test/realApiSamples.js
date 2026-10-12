// Responses captured from the running HustleHub+ API (backend on the dev
// branch, 12 October 2026). The fake server's tests compare against these, so
// if the fake ever drifts away from the real API's fields, a test fails.

export const realGigCreated = {
  title: 'Logo design & branding',
  description: "Three concepts, one revision round, and it's all included.",
  category: 'Writing & Translation',
  price: 20,
  freelancer: '6acce8ab3a0ed0d66f2480c7',
  isActive: true,
  _id: '6acce8ab3a0ed0d66f2480d0',
  createdAt: '2026-10-12T14:03:23.655Z',
  updatedAt: '2026-10-12T14:03:23.655Z',
}

export const realGigPublic = {
  _id: '6acce8ab3a0ed0d66f2480d0',
  title: 'Logo design & branding',
  description: "Three concepts, one revision round, and it's all included.",
  category: 'Writing & Translation',
  price: 20,
  freelancer: '6acce8ab3a0ed0d66f2480c7',
  createdAt: '2026-10-12T14:03:23.655Z',
  updatedAt: '2026-10-12T14:03:23.655Z',
}

export const realPagination = { page: 1, limit: 50, total: 1, totalPages: 1 }

export const realBooking = {
  _id: '6acce8ab3a0ed0d66f2480db',
  gig: '6acce8ab3a0ed0d66f2480d0',
  client: '6acce8ab3a0ed0d66f2480ca',
  freelancer: '6acce8ab3a0ed0d66f2480c7',
  agreedPriceCents: 2000,
  status: 'pending',
  createdAt: '2026-10-12T14:03:23.720Z',
  updatedAt: '2026-10-12T14:03:23.720Z',
}

export const realTransactionPaid = {
  booking: '6acce8ab3a0ed0d66f2480db',
  client: '6acce8ab3a0ed0d66f2480ca',
  freelancer: '6acce8ab3a0ed0d66f2480c7',
  amountCents: 2000,
  status: 'succeeded',
  paymentMethod: 'simulated',
  _id: '6acce8ab3a0ed0d66f2480ee',
  createdAt: '2026-10-12T14:03:23.841Z',
  updatedAt: '2026-10-12T14:03:23.841Z',
  amountFormatted: 'R20.00',
}

export const realIncome = {
  totalIncomeCents: 2000,
  totalIncomeFormatted: 'R20.00',
  completedPayments: 1,
  currency: 'ZAR',
  transactions: [
    {
      _id: '6acce8ab3a0ed0d66f2480ee',
      booking: '6acce8ab3a0ed0d66f2480db',
      amountCents: 2000,
      status: 'succeeded',
      createdAt: '2026-10-12T14:03:23.841Z',
    },
  ],
}
