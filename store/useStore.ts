import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { ACHIEVEMENTS, Achievement } from '../data/achievements';

export interface RoutineSet {
  reps: number;
  weight: number;
  isWarmup?: boolean;
  // Sub-series para dropsets (3.1, 3.2, etc.) - cada una con peso/reps diferentes
  dropsets?: Array<{ reps: number; weight: number }>;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  notes?: string;
  sets: RoutineSet[];
  restSeconds?: number; // Rest time in seconds for this exercise
  includesBodyweight?: boolean; // For exercises like dips, pull-ups where volume = bodyweight + added weight
  // Legacy fields for backward compatibility - optional or deprecated
  reps?: number;
  weight?: number;
}

export interface UserData {
  id: string;
  email?: string;
  provider?: string;
  last_sign_in_at?: string;
  user_metadata?: any;
  default_rest_seconds?: number;
  default_sets_count?: number;
  default_reps_count?: number;
  default_weight_kg?: number;
}


export interface ExerciseLibraryItem {
  id: string;
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  category: string;
  instructions?: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_id?: string;
  routine_name: string;
  started_at: string;
  completed_at: string;
  exercises_completed: any[];
  workout_data?: any; // To support JSONB data including nested exercises
  total_volume: number;
  duration_minutes: number;
}

export interface ActiveWorkoutExercise {
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  imageUrl?: string;
  notes?: string;
  includesBodyweight?: boolean; // For exercises like dips where volume = bodyweight + added weight
  sets: Array<{
    reps: number;
    weight: number;
    restSeconds: number;
    completed: boolean;
    isWarmup?: boolean;
    // Sub-series para dropsets (3.1, 3.2, etc.)
    dropsets?: Array<{ reps: number; weight: number; completed?: boolean }>;
  }>;
}

export interface ActiveWorkout {
  id?: string;
  routineId?: string;
  routineName: string;
  startedAt: string;
  isPaused?: boolean;
  pausedAt?: string;
  totalPausedMs?: number; // Track total paused time
  exercises: ActiveWorkoutExercise[];
}

export interface RoutineFolder {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  folder_id?: string | null;
  exercises: Exercise[];
  default_rest_seconds?: number;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  recovery: number;
  totalVolume: number; // in kg
  consistency: number; // percentage
  streak: number;
}

interface OnboardingData {
  level: string;
  mainGoal: string;
  conditions: string[];
  weight?: number;
  height?: number;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  date: string;
  weight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps_left?: number;
  biceps_right?: number;
  thigh_left?: number;
  thigh_right?: number;
  calf_left?: number;
  calf_right?: number;
  shoulders?: number;
  neck?: number;
  forearm_left?: number;
  forearm_right?: number;
  notes?: string;
  created_at: string;
}

interface AppState {
  routineName: string;
  exercises: Exercise[];
  stats: UserStats;
  onboardingData: OnboardingData;

  // Routine Management
  savedRoutines: Routine[];
  currentRoutineId: string | null;

  // Routine Folders
  routineFolders: RoutineFolder[];
  loadFolders: () => Promise<void>;
  createFolder: (name: string, color?: string) => Promise<RoutineFolder | null>;
  updateFolder: (id: string, updates: Partial<RoutineFolder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveRoutineToFolder: (routineId: string, folderId: string | null) => Promise<void>;
  duplicateRoutine: (routineId: string) => Promise<Routine | null>;

  // Exercise Library
  exerciseLibrary: ExerciseLibraryItem[];
  selectedMuscleFilter: string | null;
  selectedEquipmentFilter: string | null;
  exerciseSearchQuery: string;

  // Workout History
  workoutHistory: WorkoutSession[];

  // Active Workout
  activeWorkout: ActiveWorkout | null;

  // Body Measurements
  bodyMeasurements: BodyMeasurement[];
  loadBodyMeasurements: () => Promise<void>;
  addBodyMeasurement: (measurement: Omit<BodyMeasurement, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  deleteBodyMeasurement: (id: string) => Promise<void>;

  // Achievements & PRs
  achievements: string[]; // IDs of unlocked achievements
  personalRecords: Record<string, { weight: number; reps: number; date: string }>;
  notification: { title: string; message: string; type: 'achievement' | 'pr' } | null;
  loadAchievements: () => Promise<void>;
  loadPersonalRecords: () => Promise<void>;
  dismissNotification: () => void;
  syncAchievementsAndPRs: () => Promise<void>;

  userData: UserData | null;
  loadUserData: () => Promise<void>;

  setRoutineName: (name: string) => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (id: string) => void;
  updateExercise: (id: string, updates: Partial<Exercise>) => void;
  setExercises: (exercises: Exercise[]) => void;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;

  // Routine CRUD
  loadRoutines: () => Promise<void>;
  saveRoutine: (name: string, exercises: Exercise[], id?: string, folderId?: string | null, defaultRestSeconds?: number) => Promise<Routine | null>;
  deleteRoutine: (id: string) => Promise<void>;
  setCurrentRoutineId: (id: string | null) => void;

  // Exercise Library
  loadExerciseLibrary: () => Promise<void>;
  setMuscleFilter: (muscle: string | null) => void;
  setEquipmentFilter: (equipment: string | null) => void;
  setExerciseSearchQuery: (query: string) => void;
  getFilteredExercises: () => ExerciseLibraryItem[];

  // Workout History
  loadWorkoutHistory: () => Promise<void>;
  saveWorkoutSession: (session: Omit<WorkoutSession, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  deleteWorkoutSession: (sessionId: string) => Promise<void>;
  deleteWorkoutSessions: (ids: string[]) => Promise<void>;

  // Active Workout
  loadActiveWorkout: () => Promise<void>;
  startWorkout: (routine: Routine) => Promise<boolean>;
  updateActiveWorkoutExerciseNotes: (exerciseId: string, notes: string) => Promise<void>;
  updateWorkoutExerciseSets: (exerciseId: string, sets: ActiveWorkoutExercise['sets']) => Promise<void>;
  saveActiveWorkoutProgress: () => Promise<void>;
  finishWorkout: () => Promise<void>;
  clearActiveWorkout: () => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  cancelWorkout: () => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      routineName: 'Empuje - Fuerza Máxima',
      exercises: [
        {
          id: '1',
          name: 'Press de Banca Plano',
          muscleGroup: 'Pecho',
          sets: [{ reps: 8, weight: 85 }, { reps: 8, weight: 85 }, { reps: 8, weight: 85 }]
        },
      ],
      stats: {
        recovery: 92,
        totalVolume: 12400,
        consistency: 15,
        streak: 5,
      },
      onboardingData: {
        level: 'Intermedio',
        mainGoal: 'Fuerza',
        conditions: [],
        weight: 75,
        height: 175,
      },
      savedRoutines: [],
      currentRoutineId: null,

      // Routine Folders
      routineFolders: [],

      // Exercise Library
      exerciseLibrary: [],
      selectedMuscleFilter: null,
      selectedEquipmentFilter: null,
      exerciseSearchQuery: '',

      // Workout History
      workoutHistory: [],

      // Active Workout
      activeWorkout: null,

      // Body Measurements
      bodyMeasurements: [],

      // Achievements & PRs
      achievements: [],
      personalRecords: {},
      notification: null,

      userData: null,

      loadUserData: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch additional profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          set({
            userData: {
              id: user.id,
              email: user.email,
              provider: user.app_metadata.provider,
              last_sign_in_at: user.last_sign_in_at,
              user_metadata: user.user_metadata,
              default_rest_seconds: profile?.default_rest_seconds || 90,
              default_sets_count: profile?.default_sets_count || 3,
              default_reps_count: profile?.default_reps_count || 10,
              default_weight_kg: profile?.default_weight_kg || 20,
            }
          });
        }
      },

      setRoutineName: (name) => set({ routineName: name }),
      addExercise: (exercise) => set((state) => ({ exercises: [...state.exercises, exercise] })),
      removeExercise: (id) => set((state) => ({ exercises: state.exercises.filter((e) => e.id !== id) })),
      updateExercise: (id, updates) => set((state) => ({
        exercises: state.exercises.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      })),
      setExercises: (exercises) => set({ exercises }),
      updateOnboardingData: (data) => set((state) => ({ onboardingData: { ...state.onboardingData, ...data } })),

      // Routine Management Functions
      loadRoutines: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('routines')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (!error && data) {
          set({ savedRoutines: data });
        }
      },

      saveRoutine: async (name: string, exercises: Exercise[], id?: string, folderId?: string | null, defaultRestSeconds?: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const routineData: any = {
          user_id: user.id,
          name,
          exercises,
          updated_at: new Date().toISOString(),
        };

        if (folderId !== undefined) {
          routineData.folder_id = folderId;
        }

        if (defaultRestSeconds !== undefined) {
          routineData.default_rest_seconds = defaultRestSeconds;
        }

        if (id) {
          // Update existing
          const { data, error } = await supabase
            .from('routines')
            .update(routineData)
            .eq('id', id)
            .select()
            .single();

          if (!error && data) {
            await get().loadRoutines();
            return data;
          }
        } else {
          // Create new
          const { data, error } = await supabase
            .from('routines')
            .insert([routineData])
            .select()
            .single();

          if (!error && data) {
            await get().loadRoutines();
            return data;
          }
        }
        return null;
      },

      deleteRoutine: async (id: string) => {
        await supabase.from('routines').delete().eq('id', id);
        await get().loadRoutines();
      },

      setCurrentRoutineId: (id: string | null) => set({ currentRoutineId: id }),

      // --- Folder Management Functions ---
      loadFolders: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('routine_folders')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true });

        if (!error && data) {
          set({ routineFolders: data });
        }
      },

      createFolder: async (name: string, color?: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const folders = get().routineFolders;
        const maxOrder = folders.length > 0 ? Math.max(...folders.map(f => f.order_index)) : 0;

        const { data, error } = await supabase
          .from('routine_folders')
          .insert([{
            user_id: user.id,
            name,
            color: color || '#3b82f6',
            order_index: maxOrder + 1
          }])
          .select()
          .single();

        if (!error && data) {
          await get().loadFolders();
          return data;
        }
        return null;
      },

      updateFolder: async (id: string, updates: Partial<RoutineFolder>) => {
        const { error } = await supabase
          .from('routine_folders')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (!error) {
          await get().loadFolders();
        }
      },

      deleteFolder: async (id: string) => {
        // Move routines out of the folder before deleting
        await supabase
          .from('routines')
          .update({ folder_id: null })
          .eq('folder_id', id);

        await supabase.from('routine_folders').delete().eq('id', id);
        await get().loadFolders();
        await get().loadRoutines();
      },

      moveRoutineToFolder: async (routineId: string, folderId: string | null) => {
        const { error } = await supabase
          .from('routines')
          .update({ folder_id: folderId, updated_at: new Date().toISOString() })
          .eq('id', routineId);

        if (!error) {
          await get().loadRoutines();
        }
      },

      duplicateRoutine: async (routineId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const routine = get().savedRoutines.find(r => r.id === routineId);
        if (!routine) return null;

        const { data, error } = await supabase
          .from('routines')
          .insert([{
            user_id: user.id,
            name: `${routine.name} (copia)`,
            exercises: routine.exercises,
            folder_id: routine.folder_id
          }])
          .select()
          .single();

        if (!error && data) {
          await get().loadRoutines();
          return data;
        }
        return null;
      },

      // Exercise Library Functions
      loadExerciseLibrary: async () => {
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data) {
          set({ exerciseLibrary: data });
        }
      },

      setMuscleFilter: (muscle: string | null) => set({ selectedMuscleFilter: muscle }),
      setEquipmentFilter: (equipment: string | null) => set({ selectedEquipmentFilter: equipment }),
      setExerciseSearchQuery: (query: string) => set({ exerciseSearchQuery: query }),

      getFilteredExercises: () => {
        const state = get();
        let filtered = state.exerciseLibrary;

        if (state.selectedMuscleFilter) {
          filtered = filtered.filter(ex => ex.primary_muscle === state.selectedMuscleFilter);
        }

        if (state.selectedEquipmentFilter) {
          filtered = filtered.filter(ex => ex.equipment === state.selectedEquipmentFilter);
        }

        if (state.exerciseSearchQuery) {
          const normalize = (str: string) =>
            str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

          const query = normalize(state.exerciseSearchQuery);

          filtered = filtered.filter(ex =>
            normalize(ex.name).includes(query)
          );
        }

        return filtered;
      },

      // Workout History Functions
      loadWorkoutHistory: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (!error && data) {
          // Calculate Stats
          const now = new Date();
          const lastWorkout = data[0]; // Most recent because of ordering

          // 1. Recovery (Simple Algorithm: 24h = 50%, 48h = 100%)
          let recovery = 100;
          if (lastWorkout) {
            const lastDate = new Date(lastWorkout.completed_at);
            const hoursSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
            recovery = Math.min(100, Math.round((hoursSince / 48) * 100));
          }

          // 2. Total Volume
          const totalVolume = data.reduce((acc, curr) => acc + (curr.total_volume || 0), 0);

          // 3. Consistency (Workouts in last 7 days vs Goal of 3)
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const workoutsLastWeek = data.filter(w => new Date(w.completed_at) > oneWeekAgo).length;
          const consistency = Math.min(100, Math.round((workoutsLastWeek / 3) * 100)); // Assuming 3 workouts/week goal

          // 4. Streak (Weeks with at least 1 workout) - Simple approximation
          let streak = 0;
          if (data.length > 0) {
            // This is a placeholder for a complex streak calc, sticking to simple active valid workouts for now
            streak = workoutsLastWeek > 0 ? 1 : 0;
          }

          set({
            workoutHistory: data,
            stats: {
              recovery,
              totalVolume,
              consistency,
              streak
            }
          });
        }
      },

      saveWorkoutSession: async (session) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('workout_sessions')
          .insert([{ ...session, user_id: user.id }]);

        if (!error) {
          await get().loadWorkoutHistory();
        }
      },

      deleteWorkoutSession: async (id: string) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from('workout_sessions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) throw error;

          // Reload history
          await get().loadWorkoutHistory();
          // Recalculate stats/achievements
          await get().syncAchievementsAndPRs();
        } catch (error) {
          console.error('Error deleting workout session:', error);
        }
      },

      deleteWorkoutSessions: async (ids: string[]) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from('workout_sessions')
            .delete()
            .in('id', ids)
            .eq('user_id', user.id);

          if (error) throw error;

          // Reload history
          await get().loadWorkoutHistory();
          // Recalculate stats/achievements
          await get().syncAchievementsAndPRs();
        } catch (error) {
          console.error('Error deleting workout sessions:', error);
        }
      },

      // Active Workout Functions
      loadActiveWorkout: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('active_workouts')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          set({
            activeWorkout: {
              id: data.id,
              routineId: data.routine_id,
              routineName: data.routine_name,
              startedAt: data.started_at,
              exercises: data.workout_data.exercises || []
            }
          });
        }
      },

      updateWorkoutExerciseSets: async (exerciseId: string, sets: ActiveWorkoutExercise['sets']) => {
        const state = get();
        if (!state.activeWorkout) return;

        const updatedExercises = state.activeWorkout.exercises.map(ex =>
          ex.exerciseId === exerciseId ? { ...ex, sets } : ex
        );

        set({
          activeWorkout: {
            ...state.activeWorkout,
            exercises: updatedExercises
          }
        });

        await get().saveActiveWorkoutProgress();
      },

      updateActiveWorkoutExerciseNotes: async (exerciseId: string, notes: string) => {
        const state = get();
        if (!state.activeWorkout) return;

        const updatedExercises = state.activeWorkout.exercises.map(ex =>
          ex.exerciseId === exerciseId ? { ...ex, notes } : ex
        );

        set({
          activeWorkout: {
            ...state.activeWorkout,
            exercises: updatedExercises
          }
        });

        await get().saveActiveWorkoutProgress();
      },

      saveActiveWorkoutProgress: async () => {
        const state = get();
        if (!state.activeWorkout) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('active_workouts')
          .update({
            workout_data: { exercises: state.activeWorkout.exercises },
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      },

      startWorkout: async (routine: Routine) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.error('No user found');
            return false;
          }

          // Fetch history if not populated
          let history = get().workoutHistory;
          if (history.length === 0) {
            await get().loadWorkoutHistory();
            history = get().workoutHistory;
          }

          const exercises: ActiveWorkoutExercise[] = routine.exercises.map(ex => {
            // Handle new format (sets array) vs old format (sets number)
            let parsedSets: { reps: number; weight: number; isWarmup?: boolean; dropsets?: Array<{ reps: number; weight: number }> }[] = [];

            if (Array.isArray(ex.sets)) {
              // New format - preserve dropsets and isWarmup
              parsedSets = ex.sets.map(s => ({
                reps: s.reps,
                weight: s.weight,
                isWarmup: s.isWarmup,
                dropsets: s.dropsets
              }));
            } else if (typeof ex.sets === 'number') {
              // Backward compatibility for old format
              const setsCount = ex.sets;
              const reps = ex.reps || 10;
              const weight = ex.weight || 0;
              parsedSets = Array.from({ length: setsCount }, () => ({
                reps,
                weight
              }));
            } else {
              // Fallback
              parsedSets = [{ reps: 10, weight: 0 }];
            }

            // Find last session with this exercise (by name)
            const lastSession = history.find(session =>
              session.exercises_completed?.some((e: any) => e.name === ex.name)
            );

            if (lastSession) {
              const lastExercise = lastSession.exercises_completed.find((e: any) => e.name === ex.name);
              if (lastExercise && lastExercise.sets) {
                // Apply last weights/reps to current sets
                parsedSets = parsedSets.map((defaultSet, index) => {
                  const lastSet = lastExercise.sets[index];
                  if (lastSet) {
                    return {
                      ...defaultSet,
                      reps: lastSet.reps,
                      weight: lastSet.weight
                    };
                  }
                  return defaultSet;
                });
              }
            }

            // Use exercise's restSeconds, fallback to routine's default, then user's default, then 90
            const restSeconds = ex.restSeconds || routine.default_rest_seconds || get().userData?.default_rest_seconds || 90;

            return {
              exerciseId: ex.id,
              name: ex.name,
              primaryMuscle: ex.muscleGroup,
              imageUrl: undefined,
              notes: ex.notes, // Copy notes from routine
              includesBodyweight: ex.includesBodyweight, // Pass bodyweight flag
              sets: parsedSets.map(s => ({
                reps: s.reps,
                weight: s.weight,
                restSeconds,
                completed: false,
                isWarmup: s.isWarmup,
                dropsets: s.dropsets?.map(d => ({ ...d, completed: false }))
              }))
            };
          });

          const activeWorkout: ActiveWorkout = {
            routineId: routine.id,
            routineName: routine.name,
            startedAt: new Date().toISOString(),
            exercises
          };

          const { data, error } = await supabase
            .from('active_workouts')
            .upsert({
              user_id: user.id,
              routine_id: routine.id,
              routine_name: routine.name,
              started_at: activeWorkout.startedAt,
              workout_data: { exercises }
            })
            .select()
            .single();

          if (error) {
            console.error('Supabase error starting workout:', error);
            return false;
          }

          if (data) {
            set({ activeWorkout: { ...activeWorkout, id: data.id } });
            return true;
          }
          return false;
        } catch (err) {
          console.error('Unexpected error starting workout:', err);
          return false;
        }
      },



      finishWorkout: async () => {
        const state = get();
        if (!state.activeWorkout) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const startTime = new Date(state.activeWorkout.startedAt);
        const endTime = new Date();
        const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

        let totalVolume = 0;
        const completedExercises = state.activeWorkout.exercises;
        const userWeight = state.onboardingData?.weight || 0;

        completedExercises.forEach(ex => {
          ex.sets.forEach(set => {
            // Only count completed sets that are NOT warmup sets
            if (set.completed && !set.isWarmup) {
              // For bodyweight exercises (like dips), add user's bodyweight to the weight
              const effectiveWeight = ex.includesBodyweight
                ? set.weight + userWeight
                : set.weight;
              totalVolume += effectiveWeight * set.reps;

              // Also count dropset sub-series volume
              if (set.dropsets && set.dropsets.length > 0) {
                set.dropsets.forEach(dropset => {
                  const dropsetWeight = ex.includesBodyweight
                    ? dropset.weight + userWeight
                    : dropset.weight;
                  totalVolume += dropsetWeight * dropset.reps;
                });
              }
            }
          });
        });

        await supabase.from('workout_sessions').insert({
          user_id: user.id,
          routine_id: state.activeWorkout.routineId,
          routine_name: state.activeWorkout.routineName,
          started_at: state.activeWorkout.startedAt,
          completed_at: endTime.toISOString(),
          exercises_completed: completedExercises,
          total_volume: totalVolume,
          duration_minutes: durationMinutes
        });

        await supabase.from('active_workouts').delete().eq('user_id', user.id);

        set({ activeWorkout: null });
        await get().loadWorkoutHistory();

        // Check for PRs and Achievements
        await get().loadPersonalRecords();
        await get().loadAchievements();

        const currentPRs = get().personalRecords;
        const myAchievements = get().achievements;
        const history = get().workoutHistory;
        let notificationToShow = null;

        // 1. Check PRs
        for (const ex of completedExercises) {
          let maxWeight = 0;
          let maxReps = 0;

          ex.sets.forEach(s => {
            if (s.completed && s.weight > maxWeight) {
              maxWeight = s.weight;
              maxReps = s.reps;
            }
          });

          if (maxWeight > 0) {
            const previousMax = currentPRs[ex.name]?.weight || 0;
            if (maxWeight > previousMax) {
              // Update DB
              const { data: existing } = await supabase
                .from('personal_records')
                .select('id')
                .eq('user_id', user.id)
                .eq('exercise_name', ex.name)
                .maybeSingle();

              if (existing) {
                await supabase.from('personal_records').update({ weight: maxWeight, reps: maxReps, date: new Date().toISOString() }).eq('id', existing.id);
              } else {
                await supabase.from('personal_records').insert({ user_id: user.id, exercise_name: ex.name, weight: maxWeight, reps: maxReps });
              }

              // Prioritize PR notification
              notificationToShow = { title: '¡Nuevo Récord Personal!', message: `${ex.name}: ${maxWeight}kg`, type: 'pr' as const };
            }
          }
        }

        // Refresh PRs locally
        await get().loadPersonalRecords();
        const updatedPRs = Object.values(get().personalRecords);

        // 2. Check Achievements
        for (const achievement of ACHIEVEMENTS) {
          if (!myAchievements.includes(achievement.id)) {
            // Check condition using updated history and PRs
            if (achievement.condition(history, updatedPRs)) {
              await supabase.from('user_achievements').insert({ user_id: user.id, achievement_id: achievement.id });

              // Only override if not already showing a PR (or maybe queue them, but for now single notif is fine)
              if (!notificationToShow) {
                notificationToShow = { title: '¡Logro Desbloqueado!', message: achievement.title, type: 'achievement' as const };
              }
            }
          }
        }

        if (notificationToShow) {
          set({ notification: notificationToShow });
        }

        await get().loadAchievements();
      },

      clearActiveWorkout: () => set({ activeWorkout: null }),

      pauseWorkout: () => {
        const state = get();
        if (state.activeWorkout && !state.activeWorkout.isPaused) {
          set({
            activeWorkout: {
              ...state.activeWorkout,
              isPaused: true,
              pausedAt: new Date().toISOString(),
            }
          });
        }
      },

      resumeWorkout: () => {
        const state = get();
        if (state.activeWorkout && state.activeWorkout.isPaused && state.activeWorkout.pausedAt) {
          const pausedDuration = new Date().getTime() - new Date(state.activeWorkout.pausedAt).getTime();
          const currentPausedMs = state.activeWorkout.totalPausedMs || 0;

          set({
            activeWorkout: {
              ...state.activeWorkout,
              isPaused: false,
              pausedAt: undefined,
              totalPausedMs: currentPausedMs + pausedDuration,
            }
          });
        }
      },

      cancelWorkout: async () => {
        const state = get();
        if (!state.activeWorkout) return;

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && state.activeWorkout.id) {
            // Delete from active_workouts table
            await supabase
              .from('active_workouts')
              .delete()
              .eq('id', state.activeWorkout.id);
          }

          // Clear local state
          set({ activeWorkout: null });
        } catch (error) {
          console.error('Error cancelling workout:', error);
        }
      },

      // Body Measurements Functions
      loadBodyMeasurements: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('body_measurements')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true }); // Ascending for charts

        if (!error && data) {
          set({ bodyMeasurements: data });
        }
      },

      addBodyMeasurement: async (measurement) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('body_measurements')
          .insert([{ ...measurement, user_id: user.id }]);

        if (!error) {
          await get().loadBodyMeasurements();
        }
      },

      deleteBodyMeasurement: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('body_measurements')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (!error) {
          await get().loadBodyMeasurements();
        }
      },

      // Achievements & PRs Implementation
      loadAchievements: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id);

        if (data) {
          set({ achievements: data.map(a => a.achievement_id) });
        }
      },

      loadPersonalRecords: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('personal_records')
          .select('exercise_name, weight, reps, date')
          .eq('user_id', user.id);

        if (data) {
          const records: Record<string, { weight: number; reps: number; date: string }> = {};
          data.forEach(r => {
            records[r.exercise_name] = { weight: r.weight, reps: r.reps, date: r.date };
          });
          set({ personalRecords: records });
        }
      },

      dismissNotification: () => set({ notification: null }),

      syncAchievementsAndPRs: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // 1. Fetch ALL workout history
          const { data: history, error } = await supabase
            .from('workout_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: true }); // Process chronologically

          if (error || !history) return;

          // 2. Recalculate PRs
          const recalculatedPRs: Record<string, { weight: number; reps: number; date: string }> = {};

          history.forEach(session => {
            session.exercises_completed?.forEach((ex: any) => {
              if (ex.sets && Array.isArray(ex.sets)) {
                ex.sets.forEach((s: any) => {
                  if (s.completed) {
                    const currentMax = recalculatedPRs[ex.name]?.weight || 0;
                    // Logic: If weight is higher, it's a new PR.
                    // IMPORTANT: Since we process chronologically, the last one standing is the current PR if weights are equal?
                    // Usually PR is strictly > currentMax.
                    if (s.weight > currentMax) {
                      recalculatedPRs[ex.name] = { weight: s.weight, reps: s.reps, date: session.completed_at };
                    }
                  }
                });
              }
            });
          });

          // 3. Recalculate Achievements
          const recalculatedAchievements: string[] = [];
          const prsArray = Object.values(recalculatedPRs);

          ACHIEVEMENTS.forEach(ach => {
            if (ach.condition(history, prsArray)) {
              recalculatedAchievements.push(ach.id);
            }
          });

          // 4. Sync to DB - PRs
          // Delete all existing PRs and re-insert (easiest way to ensure sync)
          await supabase.from('personal_records').delete().eq('user_id', user.id);

          if (Object.keys(recalculatedPRs).length > 0) {
            const prsToInsert = Object.entries(recalculatedPRs).map(([name, data]) => ({
              user_id: user.id,
              exercise_name: name,
              weight: data.weight,
              reps: data.reps,
              date: data.date
            }));
            await supabase.from('personal_records').insert(prsToInsert);
          }

          // 5. Sync to DB - Achievements
          // Delete all achievements and re-insert
          await supabase.from('user_achievements').delete().eq('user_id', user.id);

          if (recalculatedAchievements.length > 0) {
            const achievementsToInsert = recalculatedAchievements.map(id => ({
              user_id: user.id,
              achievement_id: id
            }));
            await supabase.from('user_achievements').insert(achievementsToInsert);
          }

          // 6. Update Local State
          set({
            achievements: recalculatedAchievements,
            personalRecords: recalculatedPRs
          });

        } catch (err) {
          console.error("Error syncing stats:", err);
        }
      },
    }),
    {
      name: 'fitness-app-storage',
    }
  )
);
