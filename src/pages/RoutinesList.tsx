import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore, Routine, RoutineFolder } from '../store/useStore';
import ConfirmDialog from '../components/ConfirmDialog';

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
        deleteFolder,
        moveRoutineToFolder,
        duplicateRoutine,
        startWorkout,
        startEmptyWorkout
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

    const contextMenuRef = useRef<HTMLDivElement>(null);

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

    // Expand all folders by default
    useEffect(() => {
        setExpandedFolders(new Set(routineFolders.map(f => f.id)));
    }, [routineFolders]);

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
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
        const target = routineFolders.find(f => f.id === folderId) || null;
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

    const handleContextMenu = (e: React.MouseEvent, type: 'routine' | 'folder', id: string) => {
        e.preventDefault();
        setContextMenu({ type, id, x: e.clientX, y: e.clientY });
    };

    const handleStartWorkout = async (routine: Routine) => {
        const success = await startWorkout(routine);
        if (success) {
            navigate(`/routine/${routine.id}/workout`);
        }
    };

    const handleStartEmptyWorkout = async () => {
        const success = await startEmptyWorkout();
        if (success) {
            navigate('/routine/free/workout');
        }
    };

    // Group routines by folder
    const routinesWithoutFolder = savedRoutines.filter(r => !r.folder_id);
    const getRoutinesInFolder = (folderId: string) => savedRoutines.filter(r => r.folder_id === folderId);

    const renderRoutineCard = (routine: Routine) => (
        <div
            key={routine.id}
            className="group relative rounded-xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-4 hover:border-primary/50 transition-all"
            onContextMenu={(e) => handleContextMenu(e, 'routine', routine.id)}
        >
            <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-bold pr-8 line-clamp-1">{routine.name}</h3>
                <div className="flex gap-1">
                    <button
                        onClick={(e) => handleContextMenu(e, 'routine', routine.id)}
                        className="size-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Más opciones"
                    >
                        <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
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

            <button
                onClick={() => handleStartWorkout(routine)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary hover:text-white transition-all"
            >
                <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                Iniciar
            </button>
        </div>
    );

    const renderFolderCard = (folder: RoutineFolder) => {
        const folderRoutines = getRoutinesInFolder(folder.id);
        const isExpanded = expandedFolders.has(folder.id);
        const isEditing = editingFolderId === folder.id;

        return (
            <div key={folder.id} className="space-y-3">
                <div
                    className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-[#233648] cursor-pointer hover:border-primary/30 transition-all"
                    onClick={() => toggleFolder(folder.id)}
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
                        <input
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
                            className="flex-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#0f1820] border border-primary focus:outline-none"
                        />
                    ) : (
                        <div className="flex-1">
                            <h3 className="font-bold">{folder.name}</h3>
                            <p className="text-sm text-gray-500">{folderRoutines.length} rutinas</p>
                        </div>
                    )}

                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e, 'folder', folder.id);
                            }}
                            className="size-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Opciones de carpeta"
                            aria-label="Opciones de carpeta"
                        >
                            <span className="material-symbols-outlined text-[18px] text-gray-400">more_vert</span>
                        </button>
                        <span
                            className="material-symbols-outlined text-gray-400 transition-transform"
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
                            <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                                <span className="material-symbols-outlined text-2xl mb-2 block opacity-50">inbox</span>
                                Carpeta vacía
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {folderRoutines.map(renderRoutineCard)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full w-full overflow-y-auto p-4 md:p-8">
            <div className="flex flex-col max-w-6xl mx-auto gap-6 pb-24">
                <header className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black">Mis Rutinas</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Organiza y ejecuta tus entrenamientos
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleStartEmptyWorkout}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-[#1a2632] border border-primary/40 text-primary font-bold hover:bg-primary/10 transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                            <span className="hidden sm:inline">Empezar entrenamiento</span>
                        </button>
                        <button
                            onClick={() => setIsCreatingFolder(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">create_new_folder</span>
                            <span className="hidden sm:inline">Nueva Carpeta</span>
                        </button>
                        <Link
                            to="/routine/new"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span className="hidden sm:inline">Nueva Rutina</span>
                        </Link>
                    </div>
                </header>

                {/* New Folder Input */}
                {isCreatingFolder && (
                    <div className="flex flex-col gap-3 p-4 rounded-xl bg-white dark:bg-[#1a2632] border border-primary shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 sm:flex-row sm:items-center">
                        <div className="size-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-white text-[20px]">folder</span>
                        </div>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateFolder();
                                if (e.key === 'Escape') setIsCreatingFolder(false);
                            }}
                            placeholder="Nombre de la carpeta..."
                            autoFocus
                            className="w-full min-w-0 px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#0f1820] focus:outline-none focus:ring-2 focus:ring-primary sm:flex-1"
                        />
                        <div className="flex w-full gap-2 sm:w-auto">
                            <button
                                onClick={handleCreateFolder}
                                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-all sm:flex-none"
                            >
                                Crear
                            </button>
                            <button
                                onClick={() => setIsCreatingFolder(false)}
                                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all sm:flex-none"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Move to folder modal */}
                {movingRoutine && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setMovingRoutine(null)}>
                        <div className="bg-white dark:bg-[#1a2632] rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                            <h2 className="text-xl font-bold mb-4">Mover rutina a...</h2>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                <button
                                    onClick={() => handleMoveToFolder(null)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-gray-400">home</span>
                                    <span>Sin carpeta</span>
                                </button>
                                {routineFolders.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => handleMoveToFolder(folder.id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                                    >
                                        <div
                                            className="size-8 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: folder.color || '#3b82f6' }}
                                        >
                                            <span className="material-symbols-outlined text-white text-[18px]">folder</span>
                                        </div>
                                        <span>{folder.name}</span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setMovingRoutine(null)}
                                className="w-full mt-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Context Menu */}
                {contextMenu && (
                    <div
                        ref={contextMenuRef}
                        className="fixed z-50 bg-white dark:bg-[#1a2632] rounded-xl shadow-xl border border-gray-200 dark:border-[#233648] py-2 min-w-[180px] animate-in fade-in zoom-in duration-150 origin-top-left"
                        style={{
                            top: contextMenu.y,
                            left: contextMenu.x > window.innerWidth / 2 ? 'auto' : contextMenu.x,
                            right: contextMenu.x > window.innerWidth / 2 ? (window.innerWidth - contextMenu.x) : 'auto',
                            transformOrigin: contextMenu.x > window.innerWidth / 2 ? 'top right' : 'top left'
                        }}
                    >
                        {contextMenu.type === 'routine' && (
                            <>
                                <Link
                                    to={`/routine/edit/${contextMenu.id}`}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    onClick={() => setContextMenu(null)}
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                    Editar
                                </Link>
                                <button
                                    onClick={() => handleDuplicateRoutine(contextMenu.id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                    Duplicar
                                </button>
                                <button
                                    onClick={() => handleMoveRoutine(contextMenu.id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-[18px]">drive_file_move</span>
                                    Mover a carpeta
                                </button>
                                <hr className="my-2 border-gray-200 dark:border-gray-700" />
                                <button
                                    onClick={() => {
                                        const routine = savedRoutines.find(r => r.id === contextMenu.id);
                                        if (routine) handleDeleteRoutine(routine);
                                        setContextMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                    Eliminar
                                </button>
                            </>
                        )}
                        {contextMenu.type === 'folder' && (
                            <>
                                <button
                                    onClick={() => {
                                        const folder = routineFolders.find(f => f.id === contextMenu.id);
                                        if (folder) {
                                            setEditingFolderId(folder.id);
                                            setEditFolderName(folder.name);
                                        }
                                        setContextMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                    Renombrar
                                </button>
                                <hr className="my-2 border-gray-200 dark:border-gray-700" />
                                <button
                                    onClick={() => {
                                        handleDeleteFolder(contextMenu.id);
                                        setContextMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                    Eliminar carpeta
                                </button>
                            </>
                        )}
                    </div>
                )}

                <ConfirmDialog
                    isOpen={!!deleteRoutineTarget}
                    title="Eliminar rutina"
                    description={deleteRoutineTarget ? `¿Eliminar la rutina "${deleteRoutineTarget.name}"?` : undefined}
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
                {deleteFolderTarget && (
                    <div
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setDeleteFolderTarget(null)}
                    >
                        <div
                            className="bg-white dark:bg-[#1a2632] rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-300"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="size-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">delete</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Eliminar carpeta</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Esta acción no se puede deshacer.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/70 dark:bg-red-900/10 p-4 text-sm text-gray-600 dark:text-gray-300 mb-5">
                                Se eliminará <span className="font-bold">{deleteFolderTarget.name}</span>. Las rutinas dentro se moverán a <span className="font-bold">Sin carpeta</span>.
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDeleteFolderTarget(null)}
                                    className="flex-1 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        await deleteFolder(deleteFolderTarget.id);
                                        setDeleteFolderTarget(null);
                                    }}
                                    className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-all"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {savedRoutines.length === 0 && routineFolders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="size-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-4xl text-gray-400">
                                fitness_center
                            </span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">No tienes rutinas aún</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Crea tu primera rutina para empezar a entrenar
                        </p>
                        <Link
                            to="/routine/new"
                            className="px-6 py-3 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-all"
                        >
                            Crear Primera Rutina
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Folders */}
                        {routineFolders.map(renderFolderCard)}

                        {/* Routines without folder */}
                        {routinesWithoutFolder.length > 0 && (
                            <div className="space-y-3">
                                {routineFolders.length > 0 && (
                                    <h2 className="text-lg font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
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
