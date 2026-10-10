import { formatDate, formatPrice } from '../utils/format'

// Shows one gig. Anything passed as children (for example a Book button) is
// rendered in an actions area at the bottom of the card.
//
// Gig text comes from other users, so it is always rendered as plain text
// (React escapes it) and never as HTML.
function GigCard({ gig, children }) {
  return (
    <article className="card gig-card">
      <h2 className="gig-title">{gig.title}</h2>
      <p className="gig-description">{gig.description}</p>

      <div className="gig-meta">
        <span className="gig-price">{formatPrice(gig.price)}</span>
        <span className="gig-date">Listed {formatDate(gig.createdAt)}</span>
      </div>

      {children && <div className="gig-actions">{children}</div>}
    </article>
  )
}

export default GigCard
