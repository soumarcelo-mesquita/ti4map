import React from 'react';
import { Hexagon } from './Hexagon';
import mapaData from '@/../mapa.json';

interface MapGridProps {
    radius: number;
    size: number;
    playerCount?: number;
    players?: any[];
    onPositionPick?: (posId: string) => void;
}

export const MapGrid: React.FC<MapGridProps> = ({ 
    radius, 
    size, 
    playerCount = 6, 
    players = [],
    onPositionPick 
}) => {
    const hexes = [];
    
    for (let q = -radius; q <= radius; q++) {
        const r1 = Math.max(-radius, -q - radius);
        const r2 = Math.min(radius, -q + radius);
        for (let r = r1; r <= r2; r++) {
            hexes.push({ q, r });
        }
    }

    const hexToPixel = (q: number, r: number) => {
        const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
        const y = size * (1.5 * r);
        return { x, y };
    };

    const playerPositionsMap = (mapaData as any)[playerCount.toString()] || {};
    
    const posOccupants = new Map();
    players.forEach(p => {
        if (p.position && playerPositionsMap[p.position]) {
            const [q, r] = playerPositionsMap[p.position];
            posOccupants.set(`${q},${r}`, p);
        }
    });

    const formatPosName = (posId: string) => {
        if (posId.toLowerCase() === 'p1') return 'SPEAKER';
        const num = posId.replace(/\D/g, '');
        return `${num}º`;
    };

    const homeSystemCoords = Object.entries(playerPositionsMap).map(([key, coords]: any) => ({
        id: key,
        label: formatPosName(key),
        q: coords[0],
        r: coords[1]
    }));

    return (
        <div className="w-full h-full flex items-center justify-center overflow-hidden bg-slate-950/20 rounded-[2rem] border border-white/5 backdrop-blur-sm">
            <svg 
                viewBox={`-400 -400 800 800`} 
                className="w-full h-full max-w-[800px] max-h-[800px] drop-shadow-2xl"
            >
                <g>
                    {hexes.map(({ q, r }) => {
                        const { x, y } = hexToPixel(q, r);
                        const isMecatol = q === 0 && r === 0;
                        const homeSystem = homeSystemCoords.find(h => h.q === q && h.r === r);
                        const occupant = posOccupants.get(`${q},${r}`);
                        
                        let image = undefined;
                        if (isMecatol) {
                            image = "/img/tiles/ST_18.png";
                        } else if (homeSystem) {
                            image = "/img/tiles/ST_0.png";
                        }
                        
                        let label = isMecatol ? "" : `${q},${r}`;
                        if (homeSystem) {
                            // Se houver ocupante, mostra Nome \n Posição (Facção)
                            label = occupant 
                                ? `${occupant.name}\n${homeSystem.label}${occupant.factionId ? ` (${occupant.factionId.toUpperCase()})` : ''}` 
                                : homeSystem.label;
                        }
                        
                        return (
                            <Hexagon 
                                key={`${q},${r}`}
                                id={`${q}-${r}`}
                                size={size}
                                x={x}
                                y={y}
                                image={image}
                                fill={occupant ? 'rgba(34, 197, 94, 0.4)' : (homeSystem ? 'rgba(34, 197, 94, 0.15)' : undefined)}
                                stroke={occupant ? '#22c55e' : (homeSystem ? 'rgba(34, 197, 94, 0.6)' : (isMecatol ? 'rgba(168, 85, 247, 0.5)' : undefined))}
                                label={label}
                                onClick={() => {
                                    if (homeSystem && !occupant && onPositionPick) {
                                        onPositionPick(homeSystem.id);
                                    }
                                }}
                            />
                        );
                    })}
                </g>
            </svg>
        </div>
    );
};
