'use client';

import React from 'react';

interface SliceHoneycombProps {
    slice: any;
    scale?: number;
}

/**
 * SliceHoneycomb
 * Renders a cluster of TI4 hex tiles in a "Honeycomb" layout.
 * Uses Flat-topped geometry consistent with the game's official assets.
 */
export function SliceHoneycomb({ slice, scale = 1 }: SliceHoneycombProps) {
    // Geometry constants for Flat-topped hexes
    // size is the radius to a point
    const size = 50; 
    const width = size * 2;
    const height = Math.sqrt(3) * size;
    
    // Standard relative axial coordinates for a "Slice" cluster
    // Oriented to have Home at the bottom-center of the view
    const relativeCoords = [
        { q: 0, r: -1 }, // T1: Directly above Home
        { q: -1, r: 0 },  // T2: Top-Left neighbor
        { q: 1, r: -1 },  // T3: Top-Right neighbor
        { q: -1, r: -1 }, // T4: Far Top-Left
        { q: 0, r: -2 },  // T5: Directly above T1 (Equator)
    ];

    const hexToPixel = (q: number, r: number) => {
        // Flat-topped conversion
        const x = size * (1.5 * q);
        const y = size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
        return { x, y };
    };

    return (
        <div 
            className="relative w-full aspect-square flex items-center justify-center pointer-events-none"
            style={{ transform: `scale(${scale})` }}
        >
            <svg 
                viewBox="-160 -180 320 320" 
                className="w-full h-full drop-shadow-2xl overflow-visible"
            >
                {/* Home System Placeholder */}
                <g transform="translate(0, 60)">
                    <HexItem 
                        tId="0" 
                        size={size} 
                        isHome 
                    />
                    
                    {/* Slice Tiles */}
                    {slice.tiles?.map((tile: any, idx: number) => {
                        const tId = typeof tile === 'object' ? tile.id : tile;
                        const coord = relativeCoords[idx] || { q: 0, r: 0 };
                        const { x, y } = hexToPixel(coord.q, coord.r);
                        
                        return (
                            <g key={idx} transform={`translate(${x}, ${y})`}>
                                <HexItem tId={tId} size={size} />
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
}

function HexItem({ tId, size, isHome }: { tId: string; size: number; isHome?: boolean }) {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i;
        const angle_rad = (Math.PI / 180) * angle_deg;
        points.push(`${size * Math.cos(angle_rad)},${size * Math.sin(angle_rad)}`);
    }

    const patternId = `draft-pattern-${tId}-${Math.random().toString(36).substring(7)}`;

    return (
        <g className="group/hex pointer-events-auto cursor-help">
            <defs>
                <pattern 
                    id={patternId} 
                    patternUnits="userSpaceOnUse" 
                    width={size * 2} 
                    height={size * 2} 
                    x={-size} 
                    y={-size}
                >
                    <image 
                        href={isHome ? "/img/tiles/ST_0.png" : `/img/tiles/ST_${tId}.png`}
                        x={0}
                        y={size * 0.134}
                        width={size * 2}
                        height={size * 1.732}
                        preserveAspectRatio="xMidYMid slice"
                        className={isHome ? "grayscale sepia brightness-75 opacity-40" : ""}
                    />
                </pattern>
            </defs>

            <polygon
                points={points.join(' ')}
                fill={`url(#${patternId})`}
                stroke={isHome ? "rgba(255,255,255,0.2)" : "rgba(56, 189, 248, 0.3)"}
                strokeWidth={2}
                className="transition-all duration-300 group-hover/hex:stroke-primary group-hover/hex:brightness-125"
            />

            {/* Label on Hover */}
            {!isHome && (
                <g className="opacity-0 group-hover/hex:opacity-100 transition-opacity">
                    <rect 
                        x="-20" 
                        y="-10" 
                        width="40" 
                        height="20" 
                        rx="10" 
                        fill="rgba(0,0,0,0.8)" 
                        className="backdrop-blur-md"
                    />
                    <text 
                        y="1" 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        fill="white" 
                        fontSize="10" 
                        fontWeight="black"
                        className="select-none"
                    >
                        #{tId}
                    </text>
                </g>
            )}

            {isHome && (
                 <text 
                    y="4" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    fill="rgba(255,255,255,0.3)" 
                    fontSize="10" 
                    fontWeight="black"
                    className="select-none uppercase tracking-widest"
                >
                    HOME
                </text>
            )}
        </g>
    );
}
