import { describe, expect, it } from 'vitest'
import { filterAndSortGigs } from './gigs'

const gigs = [
  { id: 'a', title: 'Logo design', description: 'Three concepts', price: 500, createdAt: '2026-09-01T09:00:00.000Z' },
  { id: 'b', title: 'React bug fixing', description: 'Debugging a React app', price: 900, createdAt: '2026-09-05T09:00:00.000Z' },
  { id: 'c', title: 'Copywriting', description: 'Landing page text', price: 750, createdAt: '2026-09-03T09:00:00.000Z' },
]

const ids = (list) => list.map((gig) => gig.id)

describe('filterAndSortGigs', () => {
  it('returns every gig, newest first, by default', () => {
    expect(ids(filterAndSortGigs(gigs))).toEqual(['b', 'c', 'a'])
  })

  it('sorts by price in both directions', () => {
    expect(ids(filterAndSortGigs(gigs, { sort: 'price-asc' }))).toEqual(['a', 'c', 'b'])
    expect(ids(filterAndSortGigs(gigs, { sort: 'price-desc' }))).toEqual(['b', 'c', 'a'])
  })

  it('falls back to newest first for an unknown sort option', () => {
    expect(ids(filterAndSortGigs(gigs, { sort: 'nonsense' }))).toEqual(['b', 'c', 'a'])
  })

  it('searches titles and descriptions without caring about case', () => {
    expect(ids(filterAndSortGigs(gigs, { query: 'REACT' }))).toEqual(['b'])
    expect(ids(filterAndSortGigs(gigs, { query: 'landing' }))).toEqual(['c'])
  })

  it('ignores spaces around the search term', () => {
    expect(ids(filterAndSortGigs(gigs, { query: '  logo  ' }))).toEqual(['a'])
  })

  it('returns nothing when no gig matches', () => {
    expect(filterAndSortGigs(gigs, { query: 'plumbing' })).toEqual([])
  })

  it('does not change the original array', () => {
    const copy = [...gigs]
    filterAndSortGigs(gigs, { sort: 'price-desc' })
    expect(gigs).toEqual(copy)
  })
})
