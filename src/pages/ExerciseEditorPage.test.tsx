import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ExerciseEditorPage from './ExerciseEditorPage';

const mocks = vi.hoisted(() => {
  const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const getUserMock = vi.fn().mockResolvedValue({
    data: {
      user: { id: 'user-1' },
    },
  });
  const fromMock = vi.fn(() => ({
    select: vi.fn((fields: string) => {
      if (fields === 'id,name') {
        return {
          order: orderMock,
        };
      }

      return {
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      };
    }),
    insert: insertMock,
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  }));

  return {
    fromMock,
    getUserMock,
    insertMock,
    orderMock,
  };
});

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUserMock,
    },
    from: mocks.fromMock,
  },
}));

describe('ExerciseEditorPage', () => {
  it('submits create flow with valid form data', async () => {
    render(
      <MemoryRouter initialEntries={['/exercises/new']}>
        <Routes>
          <Route path="/exercises/new" element={<ExerciseEditorPage />} />
          <Route path="/exercises" element={<div>Exercises list</div>} />
        </Routes>
      </MemoryRouter>
    );

    const nameInput = await screen.findByPlaceholderText('Ejemplo: Press de banca inclinado');
    fireEvent.change(nameInput, { target: { value: 'Push Up' } });

    const saveButton = screen.getByRole('button', { name: 'Guardar' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mocks.insertMock).toHaveBeenCalledTimes(1);
    });

    const [insertArg] = mocks.insertMock.mock.calls[0];
    expect(insertArg[0].name).toBe('Push Up');
    expect(insertArg[0].user_id).toBe('user-1');
  });
});
