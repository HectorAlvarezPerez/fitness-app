import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  store: { current: {} as any },
  reorderFolders: vi.fn(),
}));

vi.mock('../store/useStore', () => ({
  useStore: () => h.store.current,
}));

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

describe('routine folder order controls', () => {
  it('exposes labeled controls and disables movement beyond list boundaries', () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'Mover Fuerza arriba' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover Fuerza abajo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mover Cardio arriba' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mover Cardio abajo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mover Movilidad abajo' })).toBeDisabled();
  });

  it('moves a folder by its visible position without toggling the folder contents', async () => {
    renderPage();
    expect(screen.getAllByText('Carpeta vacía')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Mover Cardio arriba' }));

    await waitFor(() => expect(h.reorderFolders).toHaveBeenCalledWith(['b', 'a', 'c']));
    expect(screen.getAllByText('Carpeta vacía')).toHaveLength(3);
  });

  it('keeps a collapsed folder collapsed when the ordered folder state changes', () => {
    const view = renderPage();
    fireEvent.click(screen.getByRole('heading', { name: 'Cardio' }));
    expect(screen.getAllByText('Carpeta vacía')).toHaveLength(2);

    h.store.current.routineFolders = [
      folder('b', 'Cardio', 1),
      folder('a', 'Fuerza', 2),
      folder('c', 'Movilidad', 3),
    ];
    view.rerender(
      <MemoryRouter>
        <RoutinesList />
      </MemoryRouter>
    );

    expect(screen.getAllByText('Carpeta vacía')).toHaveLength(2);
  });

  it('shows retryable feedback after a failed reorder and clears it after success', async () => {
    h.reorderFolders.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderPage();
    const moveCardioUp = screen.getByRole('button', { name: 'Mover Cardio arriba' });

    fireEvent.click(moveCardioUp);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo guardar el nuevo orden de las carpetas. Vuelve a intentarlo.'
    );
    expect(moveCardioUp).toBeEnabled();

    fireEvent.click(moveCardioUp);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(h.reorderFolders).toHaveBeenCalledTimes(2);
  });

  it('disables reorder controls and ignores overlapping moves while saving', async () => {
    const pending = deferred<boolean>();
    h.reorderFolders.mockReturnValueOnce(pending.promise);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mover Cardio arriba' }));

    const reorderControls = screen.getAllByRole('button', { name: /Mover .+ (arriba|abajo)/ });
    reorderControls.forEach((control) => expect(control).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Mover Fuerza abajo' }));
    expect(h.reorderFolders).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve(true));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Mover Fuerza abajo' })).toBeEnabled()
    );
  });
});
