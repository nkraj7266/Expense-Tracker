import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import './Charts.css'

const COLORS = [
  '#F59E0B', '#84CC16', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444',
  '#10B981', '#06B6D4', '#6366F1', '#F97316', '#D946EF', '#6B7280',
]

export default function CategoryBreakdown({ data }) {
  if (!data.length) {
    return <p className="chart-empty">No spending in this period yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="category" innerRadius={60} outerRadius={100} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => value.toFixed(2)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
