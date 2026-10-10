export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
]

const sorters = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
}

/**
 * Filters gigs by a search term (title or description, ignoring case) and
 * sorts them. Returns a new array and never changes the one passed in.
 */
export const filterAndSortGigs = (gigs, { query = '', sort = 'newest' } = {}) => {
  const term = query.trim().toLowerCase()

  const matches = term
    ? gigs.filter(
        (gig) =>
          gig.title.toLowerCase().includes(term) || gig.description.toLowerCase().includes(term),
      )
    : [...gigs]

  return matches.sort(sorters[sort] || sorters.newest)
}
