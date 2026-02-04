import React, { useState, useEffect, useMemo } from 'react';
import { useStore, BodyMeasurement } from '../store/useStore';
import { BodyHeatmap } from '../components/BodyHeatmap';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function ProgressPage() {
    const {
        workoutHistory,
        loadWorkoutHistory,
        bodyMeasurements,
        loadBodyMeasurements,
        addBodyMeasurement,
        deleteBodyMeasurement
    } = useStore();

    const [activeTab, setActiveTab] = useState<'heatmap' | 'measurements'>('heatmap');

    // --- HEATMAP STATE ---
    const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

    // --- MEASUREMENTS STATE ---
    const [measurementTab, setMeasurementTab] = useState<'chart' | 'history' | 'add'>('chart');
    const [selectedMetric, setSelectedMetric] = useState<keyof BodyMeasurement | 'weight'>('weight');

    // Form State for Measurements
    const [formData, setFormData] = useState<Partial<BodyMeasurement>>({
        date: new Date().toISOString().split('T')[0],
        weight: undefined,
        chest: undefined,
        waist: undefined,
        hips: undefined,
        biceps_left: undefined,
        biceps_right: undefined,
        thigh_left: undefined,
        thigh_right: undefined,
        calf_left: undefined,
        calf_right: undefined,
        shoulders: undefined,
        neck: undefined,
        forearm_left: undefined,
        forearm_right: undefined,
        notes: ''
    });

    useEffect(() => {
        loadWorkoutHistory();
        loadBodyMeasurements();
    }, [loadWorkoutHistory, loadBodyMeasurements]);

    // --- HEATMAP HELPERS ---
    const getWeekKey = (date: Date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const year = d.getUTCFullYear();
        const weekNo = Math.ceil((((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000) + 1) / 7);
        return `${year}-W${weekNo}`;
    };

    const getStartOfWeek = (offset: number) => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        d.setDate(diff + (offset * 7));
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const startOfSelectedWeek = useMemo(() => getStartOfWeek(selectedWeekOffset), [selectedWeekOffset]);
    const endOfSelectedWeek = useMemo(() => {
        const d = new Date(startOfSelectedWeek);
        d.setDate(d.getDate() + 6);
        d.setHours(23, 59, 59, 999);
        return d;
    }, [startOfSelectedWeek]);

    const weeklyMuscleData = useMemo(() => {
        const muscleCounts: { [key: string]: number } = {};
        let maxCount = 0;

        workoutHistory.forEach(session => {
            const date = new Date(session.completed_at);
            if (date >= startOfSelectedWeek && date <= endOfSelectedWeek) {
                session.exercises_completed?.forEach((ex: any) => {
                    let muscle = ex.primaryMuscle || ex.muscleGroup || '';
                    muscle = muscle.toLowerCase();

                    if (muscle.includes('pecho') || muscle.includes('chest')) muscle = 'pecho';
                    else if (muscle.includes('espald') || muscle.includes('back') || muscle.includes('dorsal')) muscle = 'espalda';
                    else if (muscle.includes('hombro') || muscle.includes('shoulder') || muscle.includes('deltoid')) muscle = 'hombros';
                    else if (muscle.includes('biceps') || muscle.includes('bíceps')) muscle = 'biceps';
                    else if (muscle.includes('triceps') || muscle.includes('tríceps')) muscle = 'triceps';
                    else if (muscle.includes('cuad') || muscle.includes('quad')) muscle = 'cuadriceps';
                    else if (muscle.includes('femoral') || muscle.includes('isquio') || muscle.includes('hamstring')) muscle = 'isquios';
                    else if (muscle.includes('gemel') || muscle.includes('calves')) muscle = 'gemelos';
                    else if (muscle.includes('glut') || muscle.includes('glutes')) muscle = 'gluteos';
                    else if (muscle.includes('abdo') || muscle.includes('core')) muscle = 'abs';
                    else if (muscle.includes('trapec') || muscle.includes('trap')) muscle = 'trapecios';
                    else if (muscle.includes('antebraz') || muscle.includes('forearm')) muscle = 'antebrazos';

                    if (muscle) {
                        const sets = Array.isArray(ex.sets) ? ex.sets.length : (ex.sets || 3);
                        muscleCounts[muscle] = (muscleCounts[muscle] || 0) + sets;
                        maxCount = Math.max(maxCount, muscleCounts[muscle]);
                    }
                });
            }
        });

        const normalizedData: { [key: string]: number } = {};
        if (maxCount > 0) {
            Object.keys(muscleCounts).forEach(key => {
                normalizedData[key] = Math.min(muscleCounts[key] / 15, 1);
            });
        }
        return { normalized: normalizedData, raw: muscleCounts };
    }, [workoutHistory, startOfSelectedWeek, endOfSelectedWeek]);

    // Pie chart data for muscles trained
    const MUSCLE_COLORS: { [key: string]: string } = {
        pecho: '#ef4444',
        espalda: '#3b82f6',
        hombros: '#f59e0b',
        biceps: '#10b981',
        triceps: '#8b5cf6',
        cuadriceps: '#ec4899',
        isquios: '#06b6d4',
        gemelos: '#84cc16',
        gluteos: '#f97316',
        abs: '#6366f1',
        trapecios: '#14b8a6',
        antebrazos: '#a855f7'
    };

    const MUSCLE_LABELS: { [key: string]: string } = {
        pecho: 'Pecho',
        espalda: 'Espalda',
        hombros: 'Hombros',
        biceps: 'Bíceps',
        triceps: 'Tríceps',
        cuadriceps: 'Cuádriceps',
        isquios: 'Isquiotibiales',
        gemelos: 'Gemelos',
        gluteos: 'Glúteos',
        abs: 'Abdominales',
        trapecios: 'Trapecios',
        antebrazos: 'Antebrazos'
    };

    const musclePieData = useMemo(() => {
        return Object.entries(weeklyMuscleData.raw)
            .map(([muscle, sets]: [string, number]) => ({
                name: MUSCLE_LABELS[muscle] || muscle,
                value: sets,
                color: MUSCLE_COLORS[muscle] || '#6b7280'
            }))
            .sort((a, b) => b.value - a.value);
    }, [weeklyMuscleData.raw]);


    // --- MEASUREMENTS HELPERS ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'date' || name === 'notes' ? value : (value ? parseFloat(value) : undefined)
        }));
    };

    const handleSubmitMeasurement = async (e: React.FormEvent) => {
        e.preventDefault();
        await addBodyMeasurement(formData as any);
        setMeasurementTab('chart');
        setFormData({
            ...formData,
            weight: undefined,
            chest: undefined,
            waist: undefined,
            hips: undefined,
            biceps_left: undefined,
            biceps_right: undefined,
            thigh_left: undefined,
            thigh_right: undefined,
            calf_left: undefined,
            calf_right: undefined,
            shoulders: undefined,
            neck: undefined,
            forearm_left: undefined,
            forearm_right: undefined,
            notes: ''
        });
    };

    const metricOptions: { key: string; label: string }[] = [
        { key: 'weight', label: 'Peso Corporal' },
        { key: 'chest', label: 'Pecho' },
        { key: 'waist', label: 'Cintura' },
        { key: 'hips', label: 'Cadera' },
        { key: 'shoulders', label: 'Hombros' },
        { key: 'neck', label: 'Cuello' },
        { key: 'biceps_left', label: 'Bíceps (Izq)' },
        { key: 'biceps_right', label: 'Bíceps (Der)' },
        { key: 'thigh_left', label: 'Muslo (Izq)' },
        { key: 'thigh_right', label: 'Muslo (Der)' },
        { key: 'calf_left', label: 'Gemelo (Izq)' },
        { key: 'calf_right', label: 'Gemelo (Der)' },
        { key: 'forearm_left', label: 'Antebrazo (Izq)' },
        { key: 'forearm_right', label: 'Antebrazo (Der)' },
    ];

    const chartData = bodyMeasurements.map(m => {
        const val = m[selectedMetric as keyof BodyMeasurement];
        return {
            date: new Date(m.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
            value: typeof val === 'number' ? val : 0
        };
    }).filter(d => d.value > 0);

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
                <header>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                        Progreso Físico
                    </h1>
                    <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800">
                        <button
                            onClick={() => setActiveTab('heatmap')}
                            className={`pb-2 px-1 font-bold text-sm transition-colors ${activeTab === 'heatmap' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Mapa de Calor
                        </button>
                        <button
                            onClick={() => setActiveTab('measurements')}
                            className={`pb-2 px-1 font-bold text-sm transition-colors ${activeTab === 'measurements' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Medidas Corporales
                        </button>
                    </div>
                </header>

                {activeTab === 'heatmap' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Week Selector */}
                        <div className="flex items-center justify-between bg-white dark:bg-[#111a22] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-[#233648]">
                            <button
                                onClick={() => setSelectedWeekOffset(prev => prev - 1)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <div className="text-center">
                                <p className="font-bold text-lg">
                                    {startOfSelectedWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {endOfSelectedWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {selectedWeekOffset === 0 ? 'Esta Semana' : `${Math.abs(selectedWeekOffset)} semana(s) ${selectedWeekOffset < 0 ? 'atrás' : 'adelante'}`}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedWeekOffset(prev => prev + 1)}
                                disabled={selectedWeekOffset >= 0}
                                className={`p-2 rounded-lg transition-colors ${selectedWeekOffset >= 0 ? 'text-gray-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>

                        {/* Heatmap Area */}
                        <div className="bg-white dark:bg-[#111a22] p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-[#233648] flex justify-center min-h-[400px]">
                            {Object.keys(weeklyMuscleData.normalized).length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-gray-400">
                                    <span className="material-symbols-outlined text-4xl mb-2">fitness_center</span>
                                    <p>No hay datos de entrenamiento para esta semana.</p>
                                </div>
                            ) : (
                                <BodyHeatmap muscleData={weeklyMuscleData.normalized} />
                            )}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-[#334155]"></div>
                                <span>Sin act.</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span>Baja</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span>Media</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span>Alta</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span>Muy Alta</span>
                            </div>
                        </div>

                        {/* Muscle Distribution Pie Chart */}
                        {musclePieData.length > 0 && (
                            <div className="bg-white dark:bg-[#111a22] p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-[#233648]">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">pie_chart</span>
                                    Distribución por Músculo
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="h-[280px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={musclePieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {musclePieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                    formatter={(value: number) => [`${value} series`, 'Total']}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {musclePieData.slice(0, 8).map((entry, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#0f1820]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{entry.name}</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">{entry.value} series</span>
                                            </div>
                                        ))}
                                        {musclePieData.length === 0 && (
                                            <p className="text-gray-500 text-sm text-center py-4">No hay datos para mostrar</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // --- MEASUREMENTS CONTENT ---
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Sub-tabs for Measurements */}
                        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                            <button
                                onClick={() => setMeasurementTab('chart')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${measurementTab === 'chart' ? 'bg-white dark:bg-[#1a2632] shadow-sm text-primary' : 'text-gray-500'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">show_chart</span>
                                    Gráficos
                                </span>
                            </button>
                            <button
                                onClick={() => setMeasurementTab('history')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${measurementTab === 'history' ? 'bg-white dark:bg-[#1a2632] shadow-sm text-primary' : 'text-gray-500'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">history</span>
                                    Historial
                                </span>
                            </button>
                            <button
                                onClick={() => setMeasurementTab('add')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${measurementTab === 'add' ? 'bg-white dark:bg-[#1a2632] shadow-sm text-primary' : 'text-gray-500'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Nuevo Registro
                                </span>
                            </button>
                        </div>

                        {measurementTab === 'chart' && (
                            <div className="bg-white dark:bg-[#111a22] p-6 rounded-2xl border border-slate-200 dark:border-[#233648]">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold">Histórico</h3>
                                    <div className="relative">
                                        <select
                                            value={selectedMetric}
                                            onChange={(e) => setSelectedMetric(e.target.value as any)}
                                            className="appearance-none pl-4 pr-10 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] text-sm font-bold outline-none"
                                        >
                                            {metricOptions.map(opt => (
                                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-sm">expand_more</span>
                                    </div>
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                                domain={['auto', 'auto']}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#3b82f6"
                                                fillOpacity={1}
                                                fill="url(#colorValue)"
                                                strokeWidth={3}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {measurementTab === 'history' && (
                            <div className="bg-white dark:bg-[#111a22] rounded-2xl border border-slate-200 dark:border-[#233648] overflow-hidden">
                                {bodyMeasurements.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        No hay registros todavía. Añade tu primer registro de medidas.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-[#121c26] dark:text-gray-400">
                                                <tr>
                                                    <th className="px-6 py-3">Fecha</th>
                                                    <th className="px-6 py-3">Peso</th>
                                                    <th className="px-6 py-3">Cintura</th>
                                                    <th className="px-6 py-3">Pecho</th>
                                                    <th className="px-6 py-3">Bíceps</th>
                                                    <th className="px-6 py-3 text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bodyMeasurements.map((m) => (
                                                    <tr key={m.id} className="bg-white border-b dark:bg-[#1a2632] dark:border-gray-800">
                                                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                                                            {new Date(m.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">{m.weight ? `${m.weight} kg` : '-'}</td>
                                                        <td className="px-6 py-4">{m.waist ? `${m.waist} cm` : '-'}</td>
                                                        <td className="px-6 py-4">{m.chest ? `${m.chest} cm` : '-'}</td>
                                                        <td className="px-6 py-4">{m.biceps_right ? `${m.biceps_right} cm` : '-'}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => deleteBodyMeasurement(m.id)}
                                                                className="text-red-500 hover:text-red-700 font-medium"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {measurementTab === 'add' && (
                            <form onSubmit={handleSubmitMeasurement} className="bg-white dark:bg-[#111a22] p-6 rounded-2xl border border-slate-200 dark:border-[#233648] space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-full">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Fecha</label>
                                        <input
                                            type="date"
                                            name="date"
                                            value={formData.date}
                                            onChange={handleInputChange}
                                            className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                            required
                                        />
                                    </div>

                                    {/* Basics */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Peso (kg)</label>
                                        <input
                                            type="number" step="0.1" name="weight" value={formData.weight || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Cintura (cm)</label>
                                        <input
                                            type="number" step="0.1" name="waist" value={formData.waist || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Pecho (cm)</label>
                                        <input
                                            type="number" step="0.1" name="chest" value={formData.chest || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Cadera (cm)</label>
                                        <input
                                            type="number" step="0.1" name="hips" value={formData.hips || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>

                                    {/* Arms */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Bíceps Izq (cm)</label>
                                        <input
                                            type="number" step="0.1" name="biceps_left" value={formData.biceps_left || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Bíceps Der (cm)</label>
                                        <input
                                            type="number" step="0.1" name="biceps_right" value={formData.biceps_right || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Antebrazo Izq (cm)</label>
                                        <input
                                            type="number" step="0.1" name="forearm_left" value={formData.forearm_left || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Antebrazo Der (cm)</label>
                                        <input
                                            type="number" step="0.1" name="forearm_right" value={formData.forearm_right || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>

                                    {/* Legs */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Muslo Izq (cm)</label>
                                        <input
                                            type="number" step="0.1" name="thigh_left" value={formData.thigh_left || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Muslo Der (cm)</label>
                                        <input
                                            type="number" step="0.1" name="thigh_right" value={formData.thigh_right || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Gemelo Izq (cm)</label>
                                        <input
                                            type="number" step="0.1" name="calf_left" value={formData.calf_left || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Gemelo Der (cm)</label>
                                        <input
                                            type="number" step="0.1" name="calf_right" value={formData.calf_right || ''} onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary outline-none"
                                            placeholder="0.0"
                                        />
                                    </div>

                                    <div className="col-span-full">
                                        <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Notas Adicionales</label>
                                        <textarea
                                            name="notes"
                                            value={formData.notes || ''}
                                            onChange={handleInputChange}
                                            className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                            rows={3}
                                            placeholder="Ej. Medidas tomadas en ayunas..."
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        className="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-primary/30"
                                    >
                                        Guardar Medidas
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
