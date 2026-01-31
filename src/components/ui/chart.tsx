"use client"

import { Bar } from "react-chartjs-2"
import { Line } from "react-chartjs-2"
import { Pie } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from "chart.js"
import { useMemo } from "react"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement)

interface ChartProps {
  data: any
  options: any
}

export function BarChart({ data, options }: ChartProps) {
  const chartData = useMemo(() => data, [data])
  return <Bar data={chartData} options={options} />
}

export function LineChart({ data, options }: ChartProps) {
  const chartData = useMemo(() => data, [data])
  return <Line data={chartData} options={options} />
}

export function PieChart({ data, options }: ChartProps) {
  const chartData = useMemo(() => data, [data])
  return <Pie data={chartData} options={options} />
}
