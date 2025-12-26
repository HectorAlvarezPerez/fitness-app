import React from 'react';

type MuscleData = {
    [key: string]: number; // 0 to 1 intensity
};

interface BodyHeatmapProps {
    muscleData: MuscleData;
}

// Detailed SVG Paths for a muscular male figure
// These are vector drawings, ensuring perfect edges and coloring.
const MUSCLE_PATHS = {
    front: {
        pecho: {
            id: 'pecho',
            path: 'M 85,68 C 85,68 95,75 100,75 C 105,75 115,68 115,68 L 115,55 C 115,55 105,58 100,58 C 95,58 85,55 85,55 Z', // Chest Plate
        },
        abs: {
            id: 'abs',
            path: 'M 90,75 L 110,75 L 108,105 L 92,105 Z', // Abs core
        },
        obliques: { // optional, mapping to abs for now
            id: 'abs',
            path: 'M 92,105 L 85,75 L 85,100 Z M 108,105 L 115,75 L 115,100 Z'
        },
        biceps_l: {
            id: 'biceps',
            path: 'M 118,58 C 122,60 125,70 120,75 L 116,72 Z', // Left Bicep
        },
        biceps_r: {
            id: 'biceps',
            path: 'M 82,58 C 78,60 75,70 80,75 L 84,72 Z', // Right Bicep
        },
        forearms_l: {
            id: 'antebrazos',
            path: 'M 120,75 L 128,95 L 122,98 L 118,78 Z',
        },
        forearms_r: {
            id: 'antebrazos',
            path: 'M 80,75 L 72,95 L 78,98 L 82,78 Z',
        },
        quads_l: {
            id: 'cuadriceps',
            path: 'M 105,110 C 115,115 120,135 118,150 L 108,148 Z', // Left Quad
        },
        quads_r: {
            id: 'cuadriceps',
            path: 'M 95,110 C 85,115 80,135 82,150 L 92,148 Z', // Right Quad
        },
        calves_l: {
            id: 'gemelos',
            path: 'M 118,155 C 122,165 120,180 115,185 L 112,158 Z'
        },
        calves_r: {
            id: 'gemelos',
            path: 'M 82,155 C 78,165 80,180 85,185 L 88,158 Z'
        },
        shoulders_l: {
            id: 'hombros',
            path: 'M 115,55 C 125,55 130,60 128,68 L 118,65 Z', // Left Delt
        },
        shoulders_r: {
            id: 'hombros',
            path: 'M 85,55 C 75,55 70,60 72,68 L 82,65 Z', // Right Delt
        },
        head: {
            id: 'head',
            path: 'M 100,50 C 108,50 108,35 100,35 C 92,35 92,50 100,50 Z', // Head
            static: true
        }
    },
    back: {
        traps: {
            id: 'trapecios',
            path: 'M 90,55 L 110,55 L 112,60 L 88,60 Z',
        },
        lats: {
            id: 'espalda',
            path: 'M 88,60 L 112,60 L 108,85 L 92,85 Z', // V-taper
        },
        lower_back: {
            id: 'lumbares',
            path: 'M 92,85 L 108,85 L 105,95 L 95,95 Z',
        },
        glutes: {
            id: 'gluteos',
            path: 'M 90,95 L 110,95 C 115,105 110,115 100,115 C 90,115 85,105 90,95 Z',
        },
        hamstrings_l: {
            id: 'isquios',
            path: 'M 102,115 L 112,118 L 110,150 L 104,148 Z',
        },
        hamstrings_r: {
            id: 'isquios',
            path: 'M 98,115 L 88,118 L 90,150 L 96,148 Z',
        },
        triceps_l: {
            id: 'triceps',
            path: 'M 115,60 C 120,62 122,70 120,75 L 115,70 Z',
        },
        triceps_r: {
            id: 'triceps',
            path: 'M 85,60 C 80,62 78,70 80,75 L 85,70 Z',
        },
        shoulders_back_l: {
            id: 'hombros',
            path: 'M 112,55 C 120,55 125,60 122,65 L 112,62 Z',
        },
        shoulders_back_r: {
            id: 'hombros',
            path: 'M 88,55 C 80,55 75,60 78,65 L 88,62 Z',
        },
        calves_back_l: {
            id: 'gemelos',
            path: 'M 110,152 C 115,160 112,175 108,180 L 105,155 Z'
        },
        calves_back_r: {
            id: 'gemelos',
            path: 'M 90,152 C 85,160 88,175 92,180 L 95,155 Z'
        }
    },
};

const getColor = (intensity: number) => {
    if (!intensity) return '#334155'; // Slate-700 (darker grey for inactive muscles in dark mode)
    if (intensity > 0.8) return '#ef4444';
    if (intensity > 0.5) return '#f97316';
    if (intensity > 0.2) return '#eab308';
    return '#22c55e';
};

// Base body silhouette color
const BODY_COLOR = '#1e293b'; // Slate-800
const STROKE_COLOR = '#475569'; // Slate-600

const MusclePath: React.FC<{ path: string; intensity: number; name: string; isStatic?: boolean }> = ({ path, intensity, name, isStatic }) => (
    <path
        d={path}
        fill={isStatic ? BODY_COLOR : getColor(intensity)}
        stroke={STROKE_COLOR}
        strokeWidth="0.5"
        className={`transition-colors duration-300 ${!isStatic ? 'hover:brightness-110 cursor-pointer' : ''}`}
    >
        <title>{name}: {Math.round(intensity * 100)}%</title>
    </path>
);

export const BodyHeatmap: React.FC<BodyHeatmapProps> = ({ muscleData }) => {
    return (
        <div className="flex justify-center gap-12 py-8">
            {/* Front View */}
            <div className="flex flex-col items-center">
                <h3 className="text-xs font-bold mb-4 text-slate-400 uppercase tracking-widest">Frente</h3>
                <svg width="150" height="250" viewBox="60 30 80 160" className="drop-shadow-xl">
                    {/* Render all paths */}
                    {Object.entries(MUSCLE_PATHS.front).map(([key, data]) => (
                        <MusclePath
                            key={key}
                            path={data.path}
                            intensity={data.static ? 0 : (muscleData[data.id] || 0)}
                            name={data.id}
                            isStatic={data.static}
                        />
                    ))}
                </svg>
            </div>

            {/* Back View */}
            <div className="flex flex-col items-center">
                <h3 className="text-xs font-bold mb-4 text-slate-400 uppercase tracking-widest">Espalda</h3>
                <svg width="150" height="250" viewBox="60 30 80 160" className="drop-shadow-xl">
                    {/* Head for back view */}
                    <path d="M 100,50 C 108,50 108,35 100,35 C 92,35 92,50 100,50 Z" fill={BODY_COLOR} stroke={STROKE_COLOR} strokeWidth="0.5" />

                    {Object.entries(MUSCLE_PATHS.back).map(([key, data]) => (
                        <MusclePath
                            key={key}
                            path={data.path}
                            intensity={muscleData[data.id] || 0}
                            name={data.id}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
};
