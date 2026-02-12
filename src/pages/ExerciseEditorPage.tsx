import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ExerciseLibraryItem } from '../store/useStore';
import {
  buildExercisePayload,
  canEditExercise,
  isMissingUserIdColumnError,
  validateExerciseName,
} from '../lib/exerciseUtils';

type ExerciseRecord = ExerciseLibraryItem & {
  user_id?: string | null;
  image_url?: string | null;
};

type ExerciseFormState = {
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  category: string;
  instructions: string;
  tracking_type: 'reps' | 'time';
};

const MUSCLE_OPTIONS = [
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Isquiotibiales',
  'Glúteos',
  'Gemelos',
  'Core',
  'Cardio',
  'Full Body',
];

const EQUIPMENT_OPTIONS = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Other'];
const CATEGORY_OPTIONS = ['Strength', 'Hypertrophy', 'Cardio', 'Mobility', 'Other'];

const getInitialForm = (): ExerciseFormState => ({
  name: '',
  primary_muscle: 'Full Body',
  secondary_muscles: [],
  equipment: 'Other',
  category: 'Strength',
  instructions: '',
  tracking_type: 'reps',
});

const ExerciseEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [form, setForm] = useState<ExerciseFormState>(getInitialForm());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [existingExercises, setExistingExercises] = useState<Array<{ id: string; name: string }>>([]);
  const [isEditable, setIsEditable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!cancelled) {
        setCurrentUserId(user?.id || null);
      }

      const listPromise = supabase.from('exercises').select('id,name').order('name', { ascending: true });
      const editPromise = isEditMode
        ? supabase.from('exercises').select('*').eq('id', id!).maybeSingle()
        : Promise.resolve({ data: null, error: null } as const);

      const [listResult, editResult] = await Promise.all([listPromise, editPromise]);

      if (cancelled) return;

      if (listResult.error) {
        setError('No se pudo cargar la lista de ejercicios.');
        setIsLoading(false);
        return;
      }

      setExistingExercises((listResult.data || []).map((item) => ({ id: item.id, name: item.name })));

      if (isEditMode) {
        if (editResult.error || !editResult.data) {
          setError('No se pudo cargar el ejercicio para editar.');
          setIsLoading(false);
          return;
        }

        const row = editResult.data as ExerciseRecord;
        const ownerId = typeof row.user_id === 'string' ? row.user_id : null;
        setIsEditable(canEditExercise(ownerId, user?.id));

        setForm({
          name: row.name || '',
          primary_muscle: row.primary_muscle || 'Full Body',
          secondary_muscles: Array.isArray(row.secondary_muscles) ? row.secondary_muscles : [],
          equipment: row.equipment || 'Other',
          category: row.category || 'Strength',
          instructions: row.instructions || '',
          tracking_type: row.tracking_type || 'reps',
        });
      }

      setIsLoading(false);
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [id, isEditMode]);

  const trimmedName = useMemo(() => form.name.trim(), [form.name]);

  const nameValidation = useMemo(
    () => validateExerciseName(trimmedName, existingExercises, id),
    [existingExercises, id, trimmedName]
  );

  const validationError = useMemo(() => {
    if (!nameValidation.error) return null;
    if (nameValidation.error === 'Name is required') return 'El nombre es obligatorio.';
    if (nameValidation.error === 'Name is too long') return 'El nombre no puede superar 120 caracteres.';
    if (nameValidation.error === 'Exercise with this name already exists') {
      return 'Ya existe un ejercicio con ese nombre.';
    }
    return 'Datos inválidos.';
  }, [nameValidation.error]);

  const handleToggleSecondaryMuscle = (muscle: string) => {
    setForm((current) => {
      const hasMuscle = current.secondary_muscles.includes(muscle);
      return {
        ...current,
        secondary_muscles: hasMuscle
          ? current.secondary_muscles.filter((item) => item !== muscle)
          : [...current.secondary_muscles, muscle],
      };
    });
  };

  const handleSave = async () => {
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isEditable) {
      setError('No tienes permisos para editar este ejercicio.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = buildExercisePayload({
      ...form,
      name: trimmedName,
    });

    if (isEditMode) {
      const { error: updateError } = await supabase.from('exercises').update(payload).eq('id', id!);

      if (updateError) {
        setError(updateError.message || 'No se pudo actualizar el ejercicio.');
        setIsSaving(false);
        return;
      }

      navigate('/exercises?saved=1');
      return;
    }

    const payloadWithUser = {
      ...payload,
      user_id: currentUserId,
    };

    const { error: createError } = await supabase.from('exercises').insert([payloadWithUser]);

    if (createError) {
      if (isMissingUserIdColumnError(createError.message || '')) {
        const { error: fallbackError } = await supabase.from('exercises').insert([payload]);
        if (fallbackError) {
          setError(fallbackError.message || 'No se pudo crear el ejercicio.');
          setIsSaving(false);
          return;
        }

        navigate('/exercises?saved=1');
        return;
      }

      setError(createError.message || 'No se pudo crear el ejercicio.');
      setIsSaving(false);
      return;
    }

    navigate('/exercises?saved=1');
  };

  if (isLoading) {
    return (
      <div className="h-full w-full overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-8 text-center text-gray-500">
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-3xl mx-auto pb-20 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">
              {isEditMode ? 'Editar ejercicio' : 'Nuevo ejercicio'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Se actualiza solo el metadata del ejercicio; el historial de sesiones no se modifica.
            </p>
          </div>
        </header>

        {!isEditable && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Este ejercicio no es editable con tu cuenta actual.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <section className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-4 md:p-5 space-y-5">
          <label className="space-y-1 block">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Nombre</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="Ejemplo: Press de banca inclinado"
              type="text"
              maxLength={120}
              disabled={!isEditable || isSaving}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Músculo principal</span>
              <select
                value={form.primary_muscle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, primary_muscle: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
                disabled={!isEditable || isSaving}
              >
                {MUSCLE_OPTIONS.map((muscle) => (
                  <option key={muscle} value={muscle}>
                    {muscle}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Equipo</span>
              <select
                value={form.equipment}
                onChange={(event) => setForm((current) => ({ ...current, equipment: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
                disabled={!isEditable || isSaving}
              >
                {EQUIPMENT_OPTIONS.map((equipment) => (
                  <option key={equipment} value={equipment}>
                    {equipment}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Categoría</span>
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
                disabled={!isEditable || isSaving}
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Tracking</span>
              <select
                value={form.tracking_type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tracking_type: event.target.value as 'reps' | 'time' }))
                }
                className="w-full rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
                disabled={!isEditable || isSaving}
              >
                <option value="reps">Reps</option>
                <option value="time">Time</option>
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Músculos secundarios</p>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_OPTIONS.filter((muscle) => muscle !== form.primary_muscle).map((muscle) => {
                const selected = form.secondary_muscles.includes(muscle);
                return (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => handleToggleSecondaryMuscle(muscle)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 dark:border-[#233648] text-gray-500 hover:border-primary/40'
                    }`}
                    disabled={!isEditable || isSaving}
                  >
                    {muscle}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="space-y-1 block">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Notas / instrucciones</span>
            <textarea
              value={form.instructions}
              onChange={(event) =>
                setForm((current) => ({ ...current, instructions: event.target.value }))
              }
              className="w-full min-h-28 rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="Técnica, configuración, notas útiles..."
              disabled={!isEditable || isSaving}
            />
          </label>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/exercises')}
              className="rounded-full border border-slate-200 dark:border-[#233648] px-4 py-2 text-sm font-bold"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
              disabled={!isEditable || isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExerciseEditorPage;
