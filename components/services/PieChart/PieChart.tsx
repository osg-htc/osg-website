'use client';

import { useEffect, useRef } from 'react';
import {
  ArcElement,
  Chart,
  Legend,
  PieController,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';

Chart.register(PieController, ArcElement, Tooltip, Legend);

const PALETTE = [
  '#f6a32a', '#37a2eb', '#ff6384', '#ff9e40', '#9966ff',
  '#4dbd74', '#ffcd56', '#00b8d4', '#c2185b', '#7e57c2',
  '#8bc34a', '#5c6bc0', '#ec407a', '#26a69a', '#d4a017',
  '#90a4ae',
];

export interface PieChartProps {
  labels: string[];
  data: number[];
  /** Accessible description of the chart. */
  ariaLabel: string;
  /** Called with the clicked slice's label. */
  onSliceClick?: (label: string) => void;
  /** Legend text color (use white on dark cards). */
  legendColor?: string;
  height?: number;
}

export function PieChart({
  labels,
  data,
  ariaLabel,
  onSliceClick,
  legendColor,
  height = 260,
}: PieChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  // Keep the latest click handler without re-creating the chart.
  const clickRef = useRef(onSliceClick);
  clickRef.current = onSliceClick;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const config: ChartConfiguration<'pie'> = {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            label: ariaLabel,
            data,
            backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 14, font: { size: 11 }, color: legendColor },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.label}: ${Number(ctx.parsed).toLocaleString()}`,
            },
          },
        },
        onClick: (_event, elements) => {
          if (elements.length && clickRef.current) {
            const index = elements[0].index;
            clickRef.current(String(labels[index]));
          }
        },
      },
    };

    chartRef.current = new Chart(canvas, config);
    return () => chartRef.current?.destroy();
  }, [labels, data, ariaLabel, legendColor]);

  return (
    <div style={{ position: 'relative', height }}>
      <canvas ref={canvasRef} role='img' aria-label={ariaLabel} />
    </div>
  );
}
