import type { Exercise, ExercisePrescription, Routine, RoutineSet } from '../store/useStore';
import type { CardioMetrics } from './trainingMetrics';

export const TRAINING_PLAN_FOLDER_NAME = 'Plan atlético — 4 fuerza + 2 cardio';

export type TrainingPlanRoutineDefinition = {
  key: string;
  name: string;
  defaultRestSeconds: number;
  exercises: Exercise[];
};

const strengthNotes = (
  prescription: ExercisePrescription,
  extra?: string,
  trackingType: 'reps' | 'time' = 'reps'
) => {
  const formatDuration = (seconds?: number) => {
    if (seconds === undefined) return '—';
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  };
  const reps =
    prescription.repMin !== undefined && prescription.repMax !== undefined
      ? trackingType === 'time'
        ? `duración ${formatDuration(prescription.repMin)}-${formatDuration(prescription.repMax)}`
        : `${prescription.repMin}-${prescription.repMax} reps`
      : '—';
  const rir =
    prescription.rirMin === prescription.rirMax
      ? `RIR ${prescription.rirMin ?? '—'}`
      : `RIR ${prescription.rirMin ?? '—'}-${prescription.rirMax ?? '—'}`;
  const formatRest = (seconds?: number) => {
    if (seconds === undefined) return '—';
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  };
  const restMin = formatRest(prescription.restMinSeconds);
  const restMax = formatRest(prescription.restMaxSeconds);
  const rest = restMin === restMax ? restMin : `${restMin}-${restMax}`;
  return [`Objetivo: ${reps} · ${rir} · descanso ${rest}.`, extra].filter(Boolean).join(' ');
};

const set = (
  id: string,
  reps: number,
  weight = 0,
  options: Partial<RoutineSet> = {}
): RoutineSet => ({ id, reps, weight, ...options });

const strength = (
  id: string,
  name: string,
  muscleGroup: string,
  workingSets: number,
  reps: number,
  prescription: ExercisePrescription,
  restSeconds: number,
  options: Partial<Exercise> = {},
  warmup = false
): Exercise => {
  const { notes: extraNotes, ...restOptions } = options;
  const trackingType = restOptions.trackingType || 'reps';
  return {
    id,
    name,
    muscleGroup,
    trackingType: 'reps',
    activityType: 'strength',
    restSeconds,
    prescription,
    notes: strengthNotes(prescription, extraNotes, trackingType),
    sets: [
      ...(warmup ? [set(`${id}-warmup`, Math.min(10, reps), 0, { isWarmup: true })] : []),
      ...Array.from({ length: workingSets }, (_, index) =>
        set(`${id}-${index + 1}`, reps, 0, { isWarmup: false })
      ),
    ],
    ...restOptions,
  };
};

const cardio = (
  id: string,
  name: string,
  durationSeconds: number,
  targets: CardioMetrics,
  notes: string
): Exercise => ({
  id,
  name,
  muscleGroup: 'Cardio',
  trackingType: 'time',
  activityType: 'cardio',
  restSeconds: 0,
  cardioTargets: targets,
  notes,
  sets: [set(`${id}-session`, durationSeconds, 0, { isWarmup: false })],
});

const upperA: TrainingPlanRoutineDefinition = {
  key: 'monday-upper-a-core',
  name: 'Lunes · Upper A + Core',
  defaultRestSeconds: 90,
  exercises: [
    strength(
      'plan-press-inclinado-convergente',
      'Press inclinado máquina convergente',
      'Pecho',
      3,
      8,
      { repMin: 6, repMax: 10, rirMin: 2, rirMax: 2, restMinSeconds: 150, restMaxSeconds: 180 },
      150,
      { notes: 'Calentamiento progresivo y después series de trabajo con técnica controlada.' },
      true
    ),
    strength(
      'plan-dominadas-neutras',
      'Dominadas agarre neutro',
      'Espalda',
      3,
      8,
      { repMin: 6, repMax: 10, rirMin: 1, rirMax: 2, restMinSeconds: 120, restMaxSeconds: 150 },
      135,
      {
        includesBodyweight: true,
        notes: 'Usa asistencia o lastre para mantener el intervalo y el RIR.',
      },
      true
    ),
    strength(
      'plan-press-pecho-maquina',
      'Press pecho máquina',
      'Pecho',
      2,
      10,
      { repMin: 8, repMax: 12, rirMin: 1, rirMax: 2, restMinSeconds: 120, restMaxSeconds: 120 },
      120
    ),
    strength(
      'plan-remo-t-pecho-apoyado',
      'Remo T pecho apoyado',
      'Espalda',
      3,
      10,
      { repMin: 8, repMax: 12, rirMin: 1, rirMax: 2, restMinSeconds: 120, restMaxSeconds: 120 },
      120
    ),
    strength(
      'plan-elevaciones-laterales-polea-a',
      'Elevaciones Laterales en Polea',
      'Hombros',
      3,
      15,
      { repMin: 12, repMax: 20, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-upper-a-ss-a' }
    ),
    strength(
      'plan-curl-bayesiano-polea',
      'Curl bayesiano en polea',
      'Bíceps',
      2,
      12,
      { repMin: 8, repMax: 15, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-upper-a-ss-a' }
    ),
    strength(
      'plan-extension-triceps-sobre-cabeza',
      'Extensión tríceps sobre cabeza unilateral',
      'Tríceps',
      2,
      12,
      { repMin: 8, repMax: 15, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-upper-a-ss-b' }
    ),
    strength(
      'plan-aperturas-polea-a',
      'Aperturas en Polea (Cable Fly)',
      'Pecho',
      2,
      15,
      { repMin: 12, repMax: 20, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-upper-a-ss-b' }
    ),
    strength(
      'plan-crunch-polea',
      'Cable Crunch',
      'Core',
      3,
      12,
      { repMin: 10, repMax: 15, rirMin: 1, rirMax: 2, restMinSeconds: 60, restMaxSeconds: 75 },
      60
    ),
  ],
};

const lower: TrainingPlanRoutineDefinition = {
  key: 'tuesday-lower',
  name: 'Martes · Lower',
  defaultRestSeconds: 90,
  exercises: [
    strength(
      'plan-hack-squat',
      'Hack Squat',
      'Cuádriceps',
      3,
      8,
      { repMin: 6, repMax: 10, rirMin: 2, rirMax: 2, restMinSeconds: 150, restMaxSeconds: 180 },
      165,
      { notes: 'Calentamiento progresivo; baja con control y evita perder la posición pélvica.' },
      true
    ),
    strength(
      'plan-peso-muerto-rumano',
      'Peso Muerto Rumano',
      'Isquiotibiales',
      3,
      8,
      { repMin: 6, repMax: 10, rirMin: 2, rirMax: 2, restMinSeconds: 150, restMaxSeconds: 150 },
      150,
      { notes: 'Bisagra de cadera; detén la bajada cuando empiece a perderse la tensión.' }
    ),
    strength(
      'plan-curl-femoral-sentado',
      'Curl Femoral Sentado',
      'Isquiotibiales',
      3,
      10,
      { repMin: 8, repMax: 12, rirMin: 1, rirMax: 1, restMinSeconds: 90, restMaxSeconds: 90 },
      90
    ),
    strength(
      'plan-extension-cuadriceps',
      'Extensiones de Cuádriceps',
      'Cuádriceps',
      3,
      12,
      { repMin: 10, repMax: 15, rirMin: 1, rirMax: 1, restMinSeconds: 90, restMaxSeconds: 90 },
      90
    ),
    strength(
      'plan-aductores-maquina',
      'Aductores en máquina',
      'Aductores',
      2,
      12,
      { repMin: 10, repMax: 15, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 90 },
      75,
      { supersetId: 'plan-lower-ss-a' }
    ),
    strength(
      'plan-gemelos-pie',
      'Elevaciones de Gemelos de Pie',
      'Gemelos',
      3,
      12,
      { repMin: 8, repMax: 15, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 90 },
      75,
      { supersetId: 'plan-lower-ss-a' }
    ),
    strength(
      'plan-plancha',
      'Plancha',
      'Core',
      2,
      45,
      { repMin: 30, repMax: 60, rirMin: 1, rirMax: 2, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { trackingType: 'time', notes: 'Mantén 45 s con respiración controlada y abdomen activo.' }
    ),
  ],
};

const qualityCardio: TrainingPlanRoutineDefinition = {
  key: 'wednesday-quality-cardio',
  name: 'Miércoles · Cardio calidad',
  defaultRestSeconds: 0,
  exercises: [
    cardio(
      'plan-carrera-calidad',
      'Correr en Cinta',
      40 * 60,
      {
        modality: 'run',
        durationSeconds: 40 * 60,
        distanceKm: 6.5,
        paceSecondsPerKm: 360,
        rpe: 7.5,
      },
      'Semanas 1-2: 10 min suave (6:15-6:45/km) + 6×(1 min rápido 4:45-5:00/km + 2 min suave 6:30-7:00/km) + 10-12 min suave. Semanas 3-4: intervalos de 2 min; semanas 5-6: intervalos de 3 min. RPE 7-8; registra duración, distancia, ritmo, FC y RPE.'
    ),
  ],
};

const upperB: TrainingPlanRoutineDefinition = {
  key: 'thursday-upper-b',
  name: 'Jueves · Upper B',
  defaultRestSeconds: 90,
  exercises: [
    strength(
      'plan-press-hombro-neutro',
      'Press hombro máquina neutro',
      'Hombros',
      3,
      8,
      { repMin: 6, repMax: 10, rirMin: 2, rirMax: 2, restMinSeconds: 120, restMaxSeconds: 150 },
      135,
      { notes: 'Primero calienta el patrón; no compenses con la zona lumbar.' },
      true
    ),
    strength(
      'plan-jalon-unilateral',
      'Jalón unilateral',
      'Espalda',
      3,
      10,
      { repMin: 8, repMax: 12, rirMin: 1, rirMax: 2, restMinSeconds: 90, restMaxSeconds: 120 },
      105,
      { notes: 'Calentamiento específico del primer tirón; controla la escápula.' },
      true
    ),
    strength(
      'plan-press-inclinado-smith',
      'Press inclinado Smith/máquina',
      'Pecho',
      3,
      10,
      { repMin: 8, repMax: 12, rirMin: 1, rirMax: 2, restMinSeconds: 120, restMaxSeconds: 120 },
      120,
      { notes: 'Primera serie de pecho: calienta con carga ligera antes del trabajo.' },
      true
    ),
    strength(
      'plan-remo-sentado-apoyo',
      'Remo sentado con apoyo',
      'Espalda',
      2,
      10,
      { repMin: 8, repMax: 12, rirMin: 1, rirMax: 2, restMinSeconds: 120, restMaxSeconds: 120 },
      120
    ),
    strength(
      'plan-elevaciones-laterales-polea-b',
      'Elevaciones laterales',
      'Hombros',
      3,
      15,
      { repMin: 12, repMax: 20, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-upper-b-ss-a' }
    ),
    strength(
      'plan-curl-predicador',
      'Curl en Predicador',
      'Bíceps',
      3,
      12,
      { repMin: 8, repMax: 15, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-upper-b-ss-a' }
    ),
    strength(
      'plan-french-press-mancuernas',
      'Press francés con mancuernas',
      'Tríceps',
      3,
      12,
      { repMin: 8, repMax: 15, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-upper-b-ss-b' }
    ),
    strength(
      'plan-pajaros-rear-delt-b',
      'Pájaros (Rear Delt Fly)',
      'Hombros',
      2,
      15,
      { repMin: 12, repMax: 20, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-upper-b-ss-b' }
    ),
  ],
};

const fullBody: TrainingPlanRoutineDefinition = {
  key: 'friday-full-body-core',
  name: 'Viernes · Full Body + Core',
  defaultRestSeconds: 90,
  exercises: [
    strength(
      'plan-curl-femoral-viernes',
      'Curl Femoral Sentado',
      'Isquiotibiales',
      2,
      10,
      { repMin: 8, repMax: 12, rirMin: 1, rirMax: 2, restMinSeconds: 90, restMaxSeconds: 90 },
      90,
      { notes: 'Primero activa la cadena posterior con una serie de calentamiento.' },
      true
    ),
    strength(
      'plan-extension-cuadriceps-viernes',
      'Extensiones de Cuádriceps',
      'Cuádriceps',
      2,
      12,
      { repMin: 10, repMax: 15, rirMin: 1, rirMax: 2, restMinSeconds: 90, restMaxSeconds: 90 },
      90
    ),
    strength(
      'plan-press-pecho-viernes',
      'Press pecho máquina',
      'Pecho',
      2,
      10,
      { repMin: 8, repMax: 12, rirMin: 1, rirMax: 2, restMinSeconds: 120, restMaxSeconds: 120 },
      120,
      { notes: 'Mantén el recorrido controlado y progresa cuando completes el rango alto.' }
    ),
    strength(
      'plan-jalon-viernes',
      'Jalón al pecho',
      'Espalda',
      2,
      10,
      { repMin: 8, repMax: 12, rirMin: 1, rirMax: 2, restMinSeconds: 120, restMaxSeconds: 120 },
      120,
      { notes: 'Recorrido completo y control escapular; progresa cuando completes el rango alto.' }
    ),
    strength(
      'plan-elevaciones-laterales-viernes',
      'Elevaciones laterales',
      'Hombros',
      3,
      15,
      { repMin: 12, repMax: 20, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-friday-ss-a' }
    ),
    strength(
      'plan-curl-biceps-viernes',
      'Curl de bíceps',
      'Bíceps',
      2,
      12,
      { repMin: 10, repMax: 15, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-friday-ss-a' }
    ),
    strength(
      'plan-triceps-polea-viernes',
      'Extensiones en Polea Alta',
      'Tríceps',
      2,
      12,
      { repMin: 10, repMax: 15, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-friday-ss-b' }
    ),
    strength(
      'plan-pajaros-viernes',
      'Pájaros (Rear Delt Fly)',
      'Hombros',
      2,
      15,
      { repMin: 12, repMax: 20, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 75 },
      60,
      { supersetId: 'plan-friday-ss-b' }
    ),
    strength(
      'plan-gemelos-viernes',
      'Elevaciones de Gemelos de Pie',
      'Gemelos',
      2,
      12,
      { repMin: 10, repMax: 15, rirMin: 1, rirMax: 1, restMinSeconds: 60, restMaxSeconds: 90 },
      75
    ),
    strength(
      'plan-elevaciones-piernas-viernes',
      'Elevaciones de Piernas',
      'Core',
      3,
      12,
      { repMin: 8, repMax: 15, rirMin: 1, rirMax: 2, restMinSeconds: 60, restMaxSeconds: 75 },
      60
    ),
  ],
};

const zoneTwo: TrainingPlanRoutineDefinition = {
  key: 'saturday-zone-2',
  name: 'Sábado · Cardio Zona 2',
  defaultRestSeconds: 0,
  exercises: [
    cardio(
      'plan-carrera-zona-2',
      'Correr en Cinta',
      45 * 60,
      {
        modality: 'run',
        durationSeconds: 45 * 60,
        distanceKm: 7.25,
        paceSecondsPerKm: 510,
        averageHeartRateBpm: 140,
        rpe: 4,
      },
      'Semanas 1-2: 45 min (~7-7,5 km); semanas 3-4: 50 min; semanas 5-6: 55 min; semanas 7-8: 60 min. Ritmo inicial 6:00-6:30/km, FC 130-150, RPE 4 y test de conversación. Prioriza test de conversación > FC > ritmo. Alternativas: bicicleta 50-65 min (cadencia 80-90) o natación 35-45 min.'
    ),
  ],
};

export const TRAINING_PLAN_ROUTINES: TrainingPlanRoutineDefinition[] = [
  upperA,
  lower,
  qualityCardio,
  upperB,
  fullBody,
  zoneTwo,
];

export const buildTrainingPlanRoutines = (
  userId: string,
  folderId: string,
  now = new Date().toISOString()
): Array<Omit<Routine, 'id'>> =>
  TRAINING_PLAN_ROUTINES.map((definition) => ({
    user_id: userId,
    name: definition.name,
    folder_id: folderId,
    exercises: definition.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((exerciseSet) => ({ ...exerciseSet })),
    })),
    default_rest_seconds: definition.defaultRestSeconds,
    created_at: now,
    updated_at: now,
  }));
