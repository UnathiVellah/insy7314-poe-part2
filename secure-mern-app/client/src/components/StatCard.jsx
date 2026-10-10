// A single headline figure, e.g. "Total income  R 1 500,00".
function StatCard({ label, value, hint }) {
  return (
    <div className="card stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint && <p className="stat-hint">{hint}</p>}
    </div>
  )
}

export default StatCard
