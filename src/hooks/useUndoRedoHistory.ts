import { useCallback, useReducer } from 'react';

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

type UndoRedoAction<T> =
  | { type: 'commit'; next: T }
  | { type: 'reset'; next: T }
  | { type: 'undo' }
  | { type: 'redo' };

const createInitialState = <T,>(present: T): UndoRedoState<T> => ({
  past: [],
  present,
  future: [],
});

const undoRedoReducer = <T,>(state: UndoRedoState<T>, action: UndoRedoAction<T>): UndoRedoState<T> => {
  switch (action.type) {
    case 'commit': {
      if (Object.is(state.present, action.next)) {
        return state;
      }

      return {
        past: [...state.past, state.present],
        present: action.next,
        future: [],
      };
    }

    case 'reset': {
      return createInitialState(action.next);
    }

    case 'undo': {
      if (state.past.length === 0) {
        return state;
      }

      const previous = state.past[state.past.length - 1]!;

      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }

    case 'redo': {
      if (state.future.length === 0) {
        return state;
      }

      const [next, ...remainingFuture] = state.future;

      return {
        past: [...state.past, state.present],
        present: next!,
        future: remainingFuture,
      };
    }

    default:
      return state;
  }
};

export function useUndoRedoHistory<T>(initialPresent: T) {
  const [state, dispatch] = useReducer(undoRedoReducer<T>, initialPresent, createInitialState);

  const commit = useCallback((next: T) => {
    dispatch({ type: 'commit', next });
  }, []);

  const reset = useCallback((next: T) => {
    dispatch({ type: 'reset', next });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'undo' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'redo' });
  }, []);

  return {
    present: state.present,
    commit,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
