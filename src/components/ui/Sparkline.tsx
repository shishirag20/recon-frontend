import React from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  values,
  width = 120,
  height = 34,
}) => {
  if (!values || values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const isUp = values[values.length - 1] >= values[0];
  const strokeColor = isUp ? 'var(--ok)' : 'var(--warn)';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};
