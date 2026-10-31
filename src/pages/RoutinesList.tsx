import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore, Routine, RoutineFolder } from '../store/useStore';
import ConfirmDialog from '../components/ConfirmDialog';
import { getActiveWorkoutPath } from '../lib/activeWorkout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const FOLDER_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

const SortableFolder: React.FC<{
  folder: RoutineFolder;
  disabled: boolean;
  children: (handle: ReturnType<typeof useSortable>) => React.ReactNode;
}> = ({ folder, disabled, children }) => {
  const sortable = useSortable({ id: folder.id, disabled });
  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      className={`space-y-3 ${sortable.isDragging ? 'relative z-20' : ''}`}
    >
      {children(sortable)}
    </div>
  );
};

const RoutinesList: React.FC = () => {
  const navigate = useNavigate();
  const {
    savedRoutines,
    routineFolders,
    loadRoutines,
    loadFolders,
    deleteRoutine,
    createFolder,
    updateFolder,
    reorderFolders,
    deleteFolder,
    moveRoutineToFolder,
    duplicateRoutine,
    installTrainingPlan,
    startWorkout,
    startEmptyWorkout,
    activeWorkout,
  } = useStore();

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    type: 'routine' | 'folder';
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [movingRoutine, setMovingRoutine] = useState<string | null>(null);
  const [deleteRoutineTarget, setDeleteRoutineTarget] = useState<Routine | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<RoutineFolder | null>(null);
  const [folderOrderError, setFolderOrderError] = useState<string | null>(null);
  const [isReorderingFolders, setIsReorderingFolders] = useState(false);
  const [isInstallingTrainingPlan, setIsInstallingTrainingPlan] = useState(false);
  const [trainingPlanMessage, setTrainingPlanMessage] = useState<string | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const knownFolderIdsRef = useRef<Set<string>>(new Set());
  const reorderInFlightRef = useRef(false);
  const folderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadRoutines();
    loadFolders();
  }, [loadRoutines, loadFolders]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Expand newly loaded folders by default without reopening folders after a reorder.
  useEffect(() => {
    const currentFolderIds = new Set(routineFolders.map((folder) => folder.id));
    setExpandedFolders((previous) => {
      const next = new Set([...previous].filter((id) => currentFolderIds.has(id)));
      routineFolders.forEach((folder) => {
        if (!knownFolderIdsRef.current.has(folder.id)) next.add(folder.id);
      });
      return next;
    });
    knownFolderIdsRef.current = currentFolderIds;
  }, [routineFolders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleUpdateFolderName = async (folderId: string) => {
    if (!editFolderName.trim()) return;
    await updateFolder(folderId, { name: editFolderName.trim() });
    setEditingFolderId(null);
    setEditFolderName('');
  };

  const handleDeleteFolder = async (folderId: string) => {
    const target = routineFolders.find((f) => f.id === folderId) || null;
    setDeleteFolderTarget(target);
  };

  const handleDeleteRoutine = async (routine: Routine) => {
    setDeleteRoutineTarget(routine);
  };

  const handleDuplicateRoutine = async (routineId: string) => {
    await duplicateRoutine(routineId);
    setContextMenu(null);
  };

  const handleMoveRoutine = (routineId: string) => {
    setMovingRoutine(routineId);
    setContextMenu(null);
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (movingRoutine) {
      await moveRoutineToFolder(movingRoutine, folderId);
      setMovingRoutine(null);
    }
  };

  const handleFolderDragEnd = async ({ active, over }: DragEndEvent) => {
    if (reorderInFlightRef.current) return;
    if (!over || active.id === over.id) return;

    const currentIndex = routineFolders.findIndex((folder) => folder.id === active.id);
    const targetIndex = routineFolders.findIndex((folder) => folder.id === over.id);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= routineFolders.length) return;
    const reorderedIds = arrayMove(routineFolders.map((folder) => folder.id), currentIndex, targetIndex);

    reorderInFlightRef.current = true;
    setIsReorderingFolders(true);
    try {
      const success = await reorderFolders(reorderedIds);
      setFolderOrderError(
        success ? null : 'No se pudo guardar el nuevo orden de las carpetas. Vuelve a intentarlo.'
      );
    } catch {
      setFolderOrderError(
        'No se pudo guardar el nuevo orden de las carpetas. Vuelve a intentarlo.'
      );
    } finally {
      reorderInFlightRef.current = false;
      setIsReorderingFolders(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'routine' | 'folder', id: string) => {
    e.preventDefault();
    setContextMenu({ type, id, x: e.clientX, y: e.clientY });
  };

  const handleStartWorkout = async (routine: Routine) => {
    const success = await startWorkout(routine);
    if (success) {
      navigate(`/routine/${routine.id}/workout`);
      return;
    }

    window.alert(
      'No se pudo iniciar la rutina. Revisa que tengas sesión iniciada y vuelve a intentar.'
    );
  };

  const handleStartEmptyWorkout = async () => {
    const success = await startEmptyWorkout();
    if (success) {
      navigate('/routine/free/workout');
      return;
    }

    window.alert(
      'No se pudo iniciar el entrenamiento. Revisa que tengas sesión iniciada y vuelve a intentar.'
    );
  };

  const handleInstallTrainingPlan = async () => {
    if (isInstallingTrainingPlan || typeof installTrainingPlan !== 'function') return;
    setIsInstallingTrainingPlan(true);
    setTrainingPlanMessage(null);
    try {
      const result = await installTrainingPlan();
      if (result.ok) {
        setTrainingPlanMessage(
          result.created > 0
            ? `Plan importado: ${result.created} rutinas nuevas${result.skipped ? `, ${result.skipped} ya existentes` : ''}.`
            : 'El plan ya estaba importado en tu cuenta.'
        );
      } else {
        setTrainingPlanMessage(result.error || 'No se pudo importar el plan. Vuelve a intentarlo.');
      }
    } catch {
      setTrainingPlanMessage('No se pudo importar el plan. Vuelve a intentarlo.');
    } finally {
      setIsInstallingTrainingPlan(false);
    }
  };

  // Group routines by folder
  const routinesWithoutFolder = savedRoutines.filter((r) => !r.folder_id);
  const getRoutinesInFolder = (folderId: string) =>
    savedRoutines.filter((r) => r.folder_id === folderId);

  const renderRoutineCard = (routine: Routine) => (
    <div
      key={routine.id}
      className="group relative rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 transition-all hover:border-primary/40 hover:bg-slate-100"
      onContextMenu={(e) => handleContextMenu(e, 'routine', routine.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-bold pr-8 line-clamp-1 text-slate-900">{routine.name}</h3>
        <div className="flex gap-1">
          <Button variant="ghost"
            type="button"
            size="icon"
            aria-label={`Más opciones de ${routine.name}`}
            onClick={(e) => handleContextMenu(e, 'routine', routine.id)}
            className="rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Más opciones"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">fitness_center</span>
          <span>{routine.exercises?.length || 0} ejercicios</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          <span>
            {new Date(routine.updated_at).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      </div>

      <Button variant="default"
        type="button"
        onClick={() => handleStartWorkout(routine)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 font-bold text-white shadow-sm transition-all hover:shadow-sm active:scale-[0.99]"
      >
        <span className="material-symbols-outlined text-[20px]">play_arrow</span>
        Iniciar
      </Button>
    </div>
  );

  const renderFolderCard = (folder: RoutineFolder) => {
    const folderRoutines = getRoutinesInFolder(folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isEditing = editingFolderId === folder.id;

    return (
      <SortableFolder key={folder.id} folder={folder} disabled={isReorderingFolders}>
        {({ attributes, listeners, isDragging }) => <>
        <div
          className="flex cursor-pointer items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3 transition-all hover:border-primary/30 hover:bg-slate-100"
          onClick={() => { if (!isDragging) toggleFolder(folder.id); }}
          onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
        >
          <div
            className="size-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: folder.color || '#3b82f6' }}
          >
            <span className="material-symbols-outlined text-white text-[20px]">
              {isExpanded ? 'folder_open' : 'folder'}
            </span>
          </div>

          {isEditing ? (
            <Input
              type="text"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateFolderName(folder.id);
                if (e.key === 'Escape') setEditingFolderId(null);
              }}
              onBlur={() => handleUpdateFolderName(folder.id)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="flex-1 rounded-xl border border-primary bg-white px-3 py-2 text-slate-900 outline-none"
            />
          ) : (
            <div className="min-w-0 flex-1">
              <h3 className="break-words font-bold text-slate-900">{folder.name}</h3>
              <p className="text-sm text-slate-600">{folderRoutines.length} rutinas</p>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" type="button" size="icon"
              {...attributes} {...listeners}
              onClick={(event) => event.stopPropagation()}
              disabled={isReorderingFolders}
              className="flex size-11 touch-none cursor-grab items-center justify-center rounded-lg text-slate-600 active:cursor-grabbing"
              title={`Arrastrar ${folder.name}`}
              aria-label={`Arrastrar ${folder.name}`}
            >
              <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
            </Button>
            <Button variant="ghost"
              type="button"
              size="icon"
              aria-label={`Opciones de ${folder.name}`}
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, 'folder', folder.id);
              }}
              className="rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title="Opciones de carpeta"
            >
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </Button>
            <span
              className="material-symbols-outlined text-slate-600 transition-transform"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              expand_more
            </span>
          </div>
        </div>

        {/* Folder contents */}
        {isExpanded && (
          <div className="pl-4 space-y-3">
            {folderRoutines.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-600">
                <span className="material-symbols-outlined text-2xl mb-2 block opacity-50">
                  inbox
                </span>
                Carpeta vacía
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {folderRoutines.map(renderRoutineCard)}
              </div>
            )}
          </div>
        )}
        </>}
      </SortableFolder>
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mobile-page flex max-w-6xl flex-col gap-6">
        <header className="mobile-hero">
          <div>

            <h1 className="mobile-title">Mis Rutinas</h1>

          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              to="/routine/new"
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Nueva rutina</span>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost"
                onClick={handleStartEmptyWorkout}
                className="mobile-card flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold text-blue-700"
              >
                <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                <span>Entreno libre</span>
              </Button>
              <Button variant="ghost"
                onClick={() => setIsCreatingFolder(true)}
                className="mobile-card flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-blue-700"
              >
                <span className="material-symbols-outlined text-[20px]">create_new_folder</span>
                <span>Carpeta</span>
              </Button>
            </div>
            <Button variant="ghost"
              type="button"
              onClick={() => void handleInstallTrainingPlan()}
              aria-label="Importar plan atlético"
              disabled={isInstallingTrainingPlan}
              className="mobile-card mt-2 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isInstallingTrainingPlan ? 'progress_activity' : 'playlist_add'}
              </span>
              <span>
                {isInstallingTrainingPlan ? 'Importando plan...' : 'Importar plan atlético'}
              </span>
            </Button>
          </div>
        </header>

        {trainingPlanMessage && (
          <div
            role="status"
            className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-blue-800"
          >
            {trainingPlanMessage}
          </div>
        )}

        {folderOrderError && (
          <div
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-700"
          >
            {folderOrderError}
          </div>
        )}

        {activeWorkout && (
          <Link
            to={getActiveWorkoutPath(activeWorkout.routineId)}
            className="mobile-card flex items-center justify-between gap-3 px-4 py-4 font-bold text-blue-700 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined">play_circle</span>
              Reanudar rutina en curso: {activeWorkout.routineName}
            </span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        )}

        {/* New Folder Input */}
        {isCreatingFolder && (
          <div className="animate-in slide-in-from-top-4 flex flex-col gap-3 rounded-[1.35rem] border border-primary/40 bg-white p-4 shadow-sm duration-300 fade-in sm:flex-row sm:items-center">
            <div className="size-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-[20px]">folder</span>
            </div>
            <Input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setIsCreatingFolder(false);
              }}
              placeholder="Nombre de la carpeta..."
              autoFocus
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 outline-none focus:border-primary sm:flex-1"
            />
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="default"
                type="button"
                onClick={handleCreateFolder}
                className="flex-1 rounded-xl bg-primary px-4 py-2 font-bold text-white transition-all hover:bg-primary/90 sm:flex-none"
              >
                Crear
              </Button>
              <Button variant="outline"
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-700 transition-all hover:bg-slate-100 sm:flex-none"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Move to folder modal */}
        <Dialog
          open={!!movingRoutine}
          onOpenChange={(open) => {
            if (!open) setMovingRoutine(null);
          }}
        >
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle>Mover rutina a...</DialogTitle>
              <DialogDescription>Elige dónde quieres guardar esta rutina.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[min(50dvh,300px)] space-y-2 overflow-y-auto">
                <Button variant="ghost"
                  onClick={() => handleMoveToFolder(null)}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-slate-800 transition-colors hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined text-slate-600">home</span>
                  <span>Sin carpeta</span>
                </Button>
                {routineFolders.map((folder) => (
                  <Button variant="ghost"
                    key={folder.id}
                    onClick={() => handleMoveToFolder(folder.id)}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-slate-800 transition-colors hover:bg-slate-100"
                  >
                    <div
                      className="size-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: folder.color || '#3b82f6' }}
                    >
                      <span className="material-symbols-outlined text-white text-[18px]">
                        folder
                      </span>
                    </div>
                    <span>{folder.name}</span>
                  </Button>
                ))}
            </div>
            <Button variant="outline" onClick={() => setMovingRoutine(null)} className="w-full">
              Cancelar
            </Button>
          </DialogContent>
        </Dialog>

        {/* Context Menu */}
        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="animate-in fade-in zoom-in fixed z-50 min-w-[180px] rounded-2xl border border-slate-200 bg-white py-2 shadow-sm duration-150 origin-top-left"
            style={{
              top: contextMenu.y,
              left: contextMenu.x > window.innerWidth / 2 ? 'auto' : contextMenu.x,
              right:
                contextMenu.x > window.innerWidth / 2 ? window.innerWidth - contextMenu.x : 'auto',
              transformOrigin: contextMenu.x > window.innerWidth / 2 ? 'top right' : 'top left',
            }}
          >
            {contextMenu.type === 'routine' && (
              <>
                <Link
                  to={`/routine/edit/${contextMenu.id}`}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-800 transition-colors hover:bg-slate-100"
                  onClick={() => setContextMenu(null)}
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar
                </Link>
                <Button variant="ghost"
                  onClick={() => handleDuplicateRoutine(contextMenu.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-slate-800 transition-colors hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  Duplicar
                </Button>
                <Button variant="ghost"
                  onClick={() => handleMoveRoutine(contextMenu.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-slate-800 transition-colors hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined text-[18px]">drive_file_move</span>
                  Mover a carpeta
                </Button>
                <hr className="my-2 border-slate-200" />
                <Button variant="ghost"
                  onClick={() => {
                    const routine = savedRoutines.find((r) => r.id === contextMenu.id);
                    if (routine) handleDeleteRoutine(routine);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-red-700 transition-colors hover:bg-red-500/10"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Eliminar
                </Button>
              </>
            )}
            {contextMenu.type === 'folder' && (
              <>
                <Button variant="ghost"
                  onClick={() => {
                    const folder = routineFolders.find((f) => f.id === contextMenu.id);
                    if (folder) {
                      setEditingFolderId(folder.id);
                      setEditFolderName(folder.name);
                    }
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-slate-800 transition-colors hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Renombrar
                </Button>
                <hr className="my-2 border-slate-200" />
                <Button variant="ghost"
                  onClick={() => {
                    handleDeleteFolder(contextMenu.id);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-red-700 transition-colors hover:bg-red-500/10"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Eliminar carpeta
                </Button>
              </>
            )}
          </div>
        )}

        <ConfirmDialog
          isOpen={!!deleteRoutineTarget}
          title="Eliminar rutina"
          description={
            deleteRoutineTarget ? `¿Eliminar la rutina "${deleteRoutineTarget.name}"?` : undefined
          }
          confirmLabel="Eliminar"
          variant="danger"
          onCancel={() => setDeleteRoutineTarget(null)}
          onConfirm={async () => {
            if (!deleteRoutineTarget) return;
            await deleteRoutine(deleteRoutineTarget.id);
            setDeleteRoutineTarget(null);
          }}
        />

        {/* Delete Folder Modal */}
        <Dialog
          open={!!deleteFolderTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteFolderTarget(null);
          }}
        >
          <DialogContent className="max-w-md p-6">
            <DialogHeader className="flex-row items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-red-500/12">
                  <span className="material-symbols-outlined text-red-700">delete</span>
                </div>
                <div>
                  <DialogTitle>Eliminar carpeta</DialogTitle>
                  <DialogDescription className="mt-2">Esta acción no se puede deshacer.</DialogDescription>
                </div>
            </DialogHeader>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-slate-700">
              Se eliminará <span className="font-bold">{deleteFolderTarget?.name}</span>. Las
              rutinas dentro se moverán a <span className="font-bold">Sin carpeta</span>.
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteFolderTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={async () => {
                  if (!deleteFolderTarget) return;
                  await deleteFolder(deleteFolderTarget.id);
                  setDeleteFolderTarget(null);
                }}
              >
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {savedRoutines.length === 0 && routineFolders.length === 0 ? (
          <div className="mobile-card flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="mb-6 flex size-24 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
              <span className="material-symbols-outlined text-5xl text-blue-700">
                fitness_center
              </span>
            </div>
            <h3 className="mb-2 text-2xl font-bold text-slate-900">No tienes rutinas aún</h3>
            <p className="mb-6 max-w-xs text-slate-600">
              Crea tu primera rutina para empezar a entrenar
            </p>
            <Link
              to="/routine/new"
              className="rounded-[1.1rem] bg-blue-600 hover:bg-blue-700 px-6 py-4 font-bold text-white shadow-sm shadow-[#2f8cff]/25"
            >
              Crear Primera Rutina
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Folders */}
            <DndContext sensors={folderSensors} collisionDetection={closestCenter} onDragEnd={handleFolderDragEnd}>
              <SortableContext items={routineFolders.map((folder) => folder.id)} strategy={verticalListSortingStrategy}>
                {routineFolders.map(renderFolderCard)}
              </SortableContext>
            </DndContext>

            {/* Routines without folder */}
            {routinesWithoutFolder.length > 0 && (
              <div className="space-y-3">
                {routineFolders.length > 0 && (
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-600">
                    <span className="material-symbols-outlined text-[20px]">folder_off</span>
                    Sin carpeta
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {routinesWithoutFolder.map(renderRoutineCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutinesList;
