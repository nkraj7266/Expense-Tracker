import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTheme } from '../../context/ThemeContext'
import { getGridColor, getLineColor } from '../../lib/chartColors'
import './Charts.css'

export default function SpendTrend({ data }) {
  const { resolvedTheme } = useTheme()

  if (!data.length) {
    return <p className="chart-empty">Not enough data to show a trend yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid stroke={getGridColor(resolvedTheme)} />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => value.toFixed(2)} />
        <Line type="monotone" dataKey="total" stroke={getLineColor(resolvedTheme)} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
