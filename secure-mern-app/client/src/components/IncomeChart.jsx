import { formatPrice } from '../utils/format'

const WIDTH = 600
const HEIGHT = 260
const PADDING = 24
const BASELINE = 210
const MAX_BAR_HEIGHT = 160

// A bar chart of income per month, drawn as SVG so it needs no chart library.
// Colours and fonts come from the stylesheet (classes), not inline styles.
//
// The chart is a picture, so it gets a text description for screen readers.
// The same figures are also listed in the earnings table on the income page.
function IncomeChart({ months }) {
  if (months.length === 0) {
    return null
  }

  const highest = Math.max(...months.map((month) => month.total))
  const slot = (WIDTH - PADDING * 2) / months.length
  const barWidth = Math.min(80, slot * 0.6)

  const description = `Income per month: ${months
    .map((month) => `${month.label} ${formatPrice(month.total)}`)
    .join(', ')}`

  return (
    <svg
      className="income-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={description}
    >
      <line className="chart-axis" x1={PADDING} y1={BASELINE} x2={WIDTH - PADDING} y2={BASELINE} />

      {months.map((month, index) => {
        const height = highest > 0 ? Math.max((month.total / highest) * MAX_BAR_HEIGHT, 2) : 2
        const x = PADDING + slot * index + (slot - barWidth) / 2
        const y = BASELINE - height
        const centre = x + barWidth / 2

        return (
          <g key={month.key} data-testid="chart-bar">
            <rect className="chart-bar" x={x} y={y} width={barWidth} height={height} rx="4" />
            <text className="chart-value" x={centre} y={y - 8} textAnchor="middle">
              {formatPrice(month.total)}
            </text>
            <text className="chart-label" x={centre} y={BASELINE + 22} textAnchor="middle">
              {month.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default IncomeChart
