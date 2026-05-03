import React from 'react';

interface HexagonProps {
    size: number;
    x: number;
    y: number;
    fill?: string;
    stroke?: string;
    label?: string;
    image?: string;
    id?: string;
    onClick?: () => void;
}

export const Hexagon: React.FC<HexagonProps> = ({ 
    size, 
    x, 
    y, 
    fill = 'rgba(30, 41, 59, 0.5)', 
    stroke = 'rgba(56, 189, 248, 0.3)', 
    label,
    image,
    id = Math.random().toString(36).substring(7),
    onClick 
}) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = (Math.PI / 180) * angle_deg;
        points.push(`${x + size * Math.cos(angle_rad)},${y + size * Math.sin(angle_rad)}`);
    }

    const patternId = `pattern-${id}`;
    
    // Suporte para múltiplas linhas no label
    const labelLines = label?.split('\n') || [];

    return (
        <g 
            className="group cursor-pointer transition-all duration-300" 
            onClick={onClick}
        >
            <defs>
                {image && (
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
                            x={size * 0.13} 
                            y={0} 
                            width={size * 1.74} 
                            height={size * 2} 
                            preserveAspectRatio="xMidYMid slice"
                        />
                    </pattern>
                )}
            </defs>

            <polygon
                points={points.join(' ')}
                fill={image ? `url(#${patternId})` : fill}
                stroke={stroke}
                strokeWidth={size * 0.05}
                className="group-hover:stroke-primary transition-colors"
            />
            
            {labelLines.map((line, idx) => (
                <text
                    key={idx}
                    x={x}
                    y={y + (idx * size * 0.3) - ((labelLines.length - 1) * size * 0.15) + (image ? size * 0.1 : 0)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={idx === 0 && labelLines.length > 1 ? "#38bdf8" : "white"}
                    fontSize={idx === 0 && labelLines.length > 1 ? size * 0.28 : size * 0.22}
                    className={`select-none pointer-events-none font-black ${idx === 0 && labelLines.length > 1 ? 'opacity-100' : 'opacity-70'} group-hover:opacity-100 transition-opacity`}
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
                >
                    {line}
                </text>
            ))}
        </g>
    );
};
