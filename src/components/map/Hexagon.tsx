import React from 'react';
import { hexCorners } from '@/lib/hex';

interface HexagonProps {
  size: number;
  x: number;
  y: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  image?: string;
  label?: string;
  labelColor?: string;
  id: string;
  onClick?: () => void;
  clickable?: boolean;
}

export const Hexagon: React.FC<HexagonProps> = ({
  size,
  x,
  y,
  fill = 'rgba(15, 23, 42, 0.5)',
  stroke = 'rgba(56, 189, 248, 0.2)',
  strokeWidth,
  image,
  label,
  labelColor,
  id,
  onClick,
  clickable,
}) => {
  const points = hexCorners(x, y, size);
  const patternId = `pat-${id}`;
  const lines = label?.split('\n') ?? [];

  return (
    <g
      onClick={onClick}
      className={clickable ? 'cursor-pointer' : undefined}
      style={{ transition: 'all 0.2s' }}
    >
      {image && (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={size * 2}
            height={size * 2}
            x={x - size}
            y={y - size}
          >
            <image
              href={image}
              x={0}
              y={size * 0.134}
              width={size * 2}
              height={size * 1.732}
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>
        </defs>
      )}

      <polygon
        points={points}
        fill={image ? `url(#${patternId})` : fill}
        stroke={stroke}
        strokeWidth={strokeWidth ?? size * 0.04}
      />

      {lines.map((line, i) => (
        <text
          key={i}
          x={x}
          y={y + i * size * 0.32 - ((lines.length - 1) * size * 0.16)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={labelColor ?? 'white'}
          fontSize={size * 0.24}
          className="select-none pointer-events-none font-black"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          {line}
        </text>
      ))}
    </g>
  );
};
