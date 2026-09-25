import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useTheme } from '../../context/ThemeContext'
import { getCategoricalColors, getOtherColor } from '../../lib/chartColors'
import './Charts.css'

const MAX_SLICES = 5

function foldIntoTopSlices(data) {
  const sorted = [...data].sort((a, b) => b.total - a.total)
  if (sorted.length <= MAX_SLICES) return sorted

  const top = sorted.slice(0, MAX_SLICES)
  const rest = sorted.slice(MAX_SLICES)
  const otherTotal = rest.reduce((sum, entry) => sum + entry.total, 0)
  return [...top, { category: 'Other', total: otherTotal }]
}

export default function CategoryBreakdown({ data }) {
  const { resolvedTheme } = useTheme()

  if (!data.length) {
    return <p className="chart-empty">No spending in this period yet.</p>
  }

  const slices = foldIntoTopSlices(data)
  const colors = getCategoricalColors(resolvedTheme)
  const otherColor = getOtherColor(resolvedTheme)

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={slices} dataKey="total" nameKey="category" innerRadius={60} outerRadius={100} paddingAngle={2}>
          {slices.map((entry, index) => (
            <Cell key={entry.category} fill={entry.category === 'Other' ? otherColor : colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => value.toFixed(2)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
