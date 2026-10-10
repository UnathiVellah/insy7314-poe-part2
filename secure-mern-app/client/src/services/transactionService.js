import { apiRequest } from './api'
import * as mockApi from '../mocks/mockApi'

const mocksEnabled = () => import.meta.env.VITE_USE_MOCKS === 'true'

/**
 * GET /api/transactions
 * Client: payments made. Freelancer: payments received. Admin: all.
 */
export const listTransactions = async () => {
  if (mocksEnabled()) return mockApi.listTransactions()
  return (await apiRequest('/api/transactions')).data
}

/**
 * GET /api/transactions/income - freelancers only.
 * Resolves with { totalIncome, transactionCount, transactions }.
 */
export const getIncome = async () => {
  if (mocksEnabled()) return mockApi.getIncome()
  return (await apiRequest('/api/transactions/income')).data
}
