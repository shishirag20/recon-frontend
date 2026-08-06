import React from 'react';

interface MatchRateRingProps {
  rate: number;
  size?: number;
  strokeWidth?: number;
}

export const MatchRateRing: React.FC<MatchRateRingProps> = ({
  rate,
  size = 64,
  strokeWidth = 6,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;

  const strokeColor =
    rate >= 90
      ? '#057A55' // ok-ink (emerald-600)
      : rate >= 70
      ? '#4F46E5' // accent (indigo-600)
      : rate >= 40
      ? '#D97706' // warn (amber-600)
      : '#DC2626'; // bad (red-600)

  return (
    <div
      className="relative flex items-center justify-center flex-none select-none"
      style={{ width: size, height: size }}
    >
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-bold text-slate-900 tnum">
        {Math.round(rate)}%
      </span>
    </div>
  );
};
