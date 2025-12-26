export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string; // Material Symbols name
    condition: (history: any[], personalRecords: any[]) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'first_workout',
        title: 'Primer Paso',
        description: 'Completa tu primer entrenamiento.',
        icon: 'footprint',
        condition: (history) => history.length >= 1
    },
    {
        id: 'five_workouts',
        title: 'Constancia',
        description: 'Completa 5 entrenamientos.',
        icon: 'fitness_center',
        condition: (history) => history.length >= 5
    },
    {
        id: 'ten_workouts',
        title: 'Imparable',
        description: 'Completa 10 entrenamientos.',
        icon: 'bolt',
        condition: (history) => history.length >= 10
    },
    {
        id: 'twenty_five_workouts',
        title: 'Veterano',
        description: 'Completa 25 entrenamientos.',
        icon: 'military_tech',
        condition: (history) => history.length >= 25
    },
    {
        id: 'early_bird',
        title: 'Madrugador',
        description: 'Termina un entrenamiento antes de las 8 AM.',
        icon: 'wb_twilight',
        condition: (history) => history.some(w => {
            const date = new Date(w.completed_at);
            return date.getHours() < 8;
        })
    },
    {
        id: 'night_owl',
        title: 'Noctámbulo',
        description: 'Termina un entrenamiento después de las 10 PM.',
        icon: 'dark_mode',
        condition: (history) => history.some(w => {
            const date = new Date(w.completed_at);
            return date.getHours() >= 22;
        })
    },
    {
        id: 'heavy_lifter',
        title: 'Peso Pesado',
        description: 'Registra un ejercicio con 100kg o más.',
        icon: 'weight',
        condition: (_, prs) => prs.some(pr => pr.weight >= 100)
    },
    {
        id: 'marathon',
        title: 'Maratón',
        description: 'Entrena durante más de 2 horas en una sola sesión.',
        icon: 'timer',
        condition: (history) => history.some(w => (w.duration_minutes || 0) > 120)
    }
];
