import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExerciseLibrarySheet from './ExerciseLibrarySheet';

const h = vi.hoisted(() => ({
  loadExerciseLibrary: vi.fn(),
  setMuscleFilter: vi.fn(),
  setEquipmentFilter: vi.fn(),
  setExerciseSearchQuery: vi.fn(),
  exercise: {
    id: 'exercise-1',
    name: 'Bench Press',
    primary_muscle: 'Pecho',
    equipment: 'Barbell',
  },
}));

vi.mock('../store/useStore', () => ({
  useStore: () => ({
    exerciseLibrary: [h.exercise],
    loadExerciseLibrary: h.loadExerciseLibrary,
    selectedMuscleFilter: null,
    selectedEquipmentFilter: null,
    exerciseSearchQuery: '',
    setMuscleFilter: h.setMuscleFilter,
    setEquipmentFilter: h.setEquipmentFilter,
    setExerciseSearchQuery: h.setExerciseSearchQuery,
    getFilteredExercises: () => [h.exercise],
  }),
}));

const dispatchTouch = (target: Element, type: string, clientY?: number) => {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  });

  Object.defineProperty(event, 'touches', {
    value: clientY === undefined ? [] : [{ clientY }],
  });
  Object.defineProperty(event, 'changedTouches', {
    value: clientY === undefined ? [] : [{ clientX: 0, clientY }],
  });

  fireEvent(target, event);
  return event;
};

const renderSheet = () => {
  const onClose = vi.fn();
  const onAddExercise = vi.fn();
  const view = render(
    <ExerciseLibrarySheet isOpen onClose={onClose} onAddExercise={onAddExercise} />
  );

  const dragHandle = view.baseElement.querySelector('.touch-none');
  if (!dragHandle) {
    throw new Error('Expected the exercise-library drag handle to render');
  }

  return {
    ...view,
    dragHandle,
    onClose,
  };
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ExerciseLibrarySheet touch dismissal', () => {
  it('closes from touchend after adding an exercise even when Safari cancels the synthetic click', () => {
    const { onClose } = renderSheet();
    const exerciseButton = screen.getByRole('button', { name: /Bench Press/ });
    const closeButton = screen.getByRole('button', {
      name: 'Cerrar biblioteca de ejercicios',
    });

    fireEvent.click(exerciseButton);
    dispatchTouch(closeButton, 'touchstart', 20);
    const moveEvent = dispatchTouch(closeButton, 'touchmove', 25);
    dispatchTouch(closeButton, 'touchend');

    expect(moveEvent.defaultPrevented).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('still closes once from a desktop or keyboard click', () => {
    const { onClose } = renderSheet();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cerrar biblioteca de ejercicios',
      })
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not capture or dismiss a downward touch sequence from the search input', () => {
    const { onClose } = renderSheet();
    const searchInput = screen.getByPlaceholderText('Buscar ejercicio...');

    dispatchTouch(searchInput, 'touchstart', 20);
    dispatchTouch(searchInput, 'touchmove', 121);
    dispatchTouch(searchInput, 'touchend');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('allows scrolling the exercise list when it has remaining content', () => {
    const { onClose } = renderSheet();
    const list = document.querySelector('.mobile-scroll');
    if (!list) throw new Error('Expected the exercise list to render');

    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 300 },
    });
    (list as HTMLElement).style.overflowY = 'auto';

    dispatchTouch(list, 'touchstart', 150);
    const moveEvent = dispatchTouch(list, 'touchmove', 100);
    dispatchTouch(list, 'touchend');

    expect(moveEvent.defaultPrevented).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dismisses once when a handle drag moves 101 pixels downward', () => {
    const { dragHandle, onClose } = renderSheet();

    dispatchTouch(dragHandle, 'touchstart', 20);
    dispatchTouch(dragHandle, 'touchmove', 121);
    dispatchTouch(dragHandle, 'touchend');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss when a handle drag moves exactly 100 pixels downward', () => {
    const { dragHandle, onClose } = renderSheet();

    dispatchTouch(dragHandle, 'touchstart', 20);
    dispatchTouch(dragHandle, 'touchmove', 120);
    dispatchTouch(dragHandle, 'touchend');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when the modal backdrop is pressed', () => {
    const { onClose } = renderSheet();
    const overlay = document.querySelector('[class*="bg-slate-950/35"]');

    if (!overlay) throw new Error('Expected the exercise-library backdrop to render');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when Escape is pressed', () => {
    const second = renderSheet();
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Biblioteca de ejercicios' }), {
      key: 'Escape',
    });
    expect(second.onClose).toHaveBeenCalledTimes(1);
  });
});
