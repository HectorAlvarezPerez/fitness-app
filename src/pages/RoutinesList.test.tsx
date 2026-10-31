import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  store: { current: {} as any },
  reorderFolders: vi.fn(),
  installTrainingPlan: vi.fn(),
  folderDragEnd: null as null | ((event: any) => void),
}));

vi.mock('../store/useStore', () => ({
  useStore: () => h.store.current,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => { h.folderDragEnd = onDragEnd; return <>{children}</>; },
  closestCenter: vi.fn(), KeyboardSensor: class {}, PointerSensor: class {}, TouchSensor: class {},
  useSensor: vi.fn(() => ({})), useSensors: vi.fn((...sensors) => sensors),
}));
vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (items: any[], from: number, to: number) => {
    const next = [...items]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next;
  },
  SortableContext: ({ children }: any) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(), useSortable: vi.fn(() => ({
    attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null,
    transition: undefined, isDragging: false,
  })), verticalListSortingStrategy: {},
}));
vi.mock('@dnd-kit/utilities', () => ({ CSS: { Transform: { toString: () => undefined } } }));

import RoutinesList from './RoutinesList';

const folder = (id: string, name: string, orderIndex: number) => ({
  id,
  user_id: 'u1',
  name,
  order_index: orderIndex,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
});

beforeEach(() => {
  h.reorderFolders.mockReset();
  h.reorderFolders.mockResolvedValue(true);
  h.installTrainingPlan.mockReset();
  h.installTrainingPlan.mockResolvedValue({ ok: true, created: 6, skipped: 0 });
  h.store.current = {
    savedRoutines: [],
    routineFolders: [
      folder('a', 'Fuerza', 1),
      folder('b', 'Cardio', 2),
      folder('c', 'Movilidad', 3),
    ],
    loadRoutines: vi.fn(),
    loadFolders: vi.fn(),
    deleteRoutine: vi.fn(),
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn(),
    moveRoutineToFolder: vi.fn(),
    duplicateRoutine: vi.fn(),
    installTrainingPlan: h.installTrainingPlan,
    reorderFolders: h.reorderFolders,
    startWorkout: vi.fn(),
    startEmptyWorkout: vi.fn(),
    activeWorkout: null,
  };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <RoutinesList />
    </MemoryRouter>
  );

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

describe('routine folder drag ordering', () => {
  const drop = (active: string, over: string | null) =>
    h.folderDragEnd?.({ active: { id: active }, over: over ? { id: over } : null });

  it('shows labeled keyboard-focusable handles without toggling the folder', () => {
    renderPage();
    const handle = screen.getByRole('button', { name: 'Arrastrar Cardio' });
    handle.focus();
    expect(handle).toHaveFocus();
    expect(screen.getAllByText('Carpeta vacía')).toHaveLength(3);
    fireEvent.click(handle);
    expect(screen.getAllByText('Carpeta vacía')).toHaveLength(3);
  });

  it('persists an ID-based move across list positions', async () => {
    renderPage();
    await act(async () => drop('c', 'a'));
    expect(h.reorderFolders).toHaveBeenCalledWith(['c', 'a', 'b']);
  });

  it('ignores canceled and same-item drops', async () => {
    renderPage();
    await act(async () => { drop('a', null); drop('b', 'b'); });
    expect(h.reorderFolders).not.toHaveBeenCalled();
  });

  it('keeps a collapsed folder collapsed when the ordered folder state changes', () => {
    const view = renderPage();
    fireEvent.click(screen.getByRole('heading', { name: 'Cardio' }));
    expect(screen.getAllByText('Carpeta vacía')).toHaveLength(2);
    h.store.current.routineFolders = [
      folder('b', 'Cardio', 1), folder('a', 'Fuerza', 2), folder('c', 'Movilidad', 3),
    ];
    view.rerender(<MemoryRouter><RoutinesList /></MemoryRouter>);
    expect(screen.getAllByText('Carpeta vacía')).toHaveLength(2);
  });

  it('shows an error after a failed drop and clears it after success', async () => {
    h.reorderFolders.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderPage();
    await act(async () => drop('b', 'a'));
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar el nuevo orden');
    await act(async () => drop('b', 'a'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(h.reorderFolders).toHaveBeenCalledTimes(2);
  });

  it('disables handles and ignores overlapping drops while saving', async () => {
    const pending = deferred<boolean>();
    h.reorderFolders.mockReturnValueOnce(pending.promise);
    renderPage();
    await act(async () => { drop('b', 'a'); });
    screen.getAllByRole('button', { name: /Arrastrar (Fuerza|Cardio|Movilidad)/ })
      .forEach((handle) => expect(handle).toBeDisabled());
    await act(async () => drop('a', 'c'));
    expect(h.reorderFolders).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(true));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Arrastrar Cardio' })).toBeEnabled());
  });
});

describe('training plan import', () => {
  it('imports the plan explicitly and reports the result', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Importar plan atlético' }));

    await waitFor(() => expect(h.installTrainingPlan).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Plan importado: 6 rutinas nuevas.'
    );
  });
});
