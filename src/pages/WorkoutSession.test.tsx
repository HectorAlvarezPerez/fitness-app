import { describe, expect, it, vi } from 'vitest';
import { getWorkoutContentReservation } from './WorkoutSession';

vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}));

describe('getWorkoutContentReservation', () => {
  it('keeps the compact mobile reservation and both inset contributions without a timer', () => {
    expect(getWorkoutContentReservation(false)).toEqual({
      mobileBaseRem: 9,
      desktopBaseRem: 9,
      includesSafeAreaInset: true,
      includesKeyboardInset: true,
    });
  });

  it('expands only the mobile reservation when the timer is visible', () => {
    expect(getWorkoutContentReservation(true)).toEqual({
      mobileBaseRem: 19,
      desktopBaseRem: 9,
      includesSafeAreaInset: true,
      includesKeyboardInset: true,
    });
  });
});
