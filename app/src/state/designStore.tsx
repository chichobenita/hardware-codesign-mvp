import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { DesignState } from '../types';
import type { DesignAction } from './designActions';
import { loadDesignState, saveDesignState } from './designPersistence';
import { designReducer } from './designReducer';

type DesignStoreContextValue = {
  state: DesignState;
  dispatch: React.Dispatch<DesignAction>;
};

const DesignStoreContext = createContext<DesignStoreContextValue | null>(null);

type DesignStoreProviderProps = {
  children: ReactNode;
  initialState?: DesignState;
};

function persistedDesignReducer(state: DesignState, action: DesignAction): DesignState {
  const nextState = designReducer(state, action);
  saveDesignState(nextState);
  return nextState;
}

export function DesignStoreProvider({ children, initialState }: DesignStoreProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(persistedDesignReducer, initialState ?? loadDesignState());

  return <DesignStoreContext.Provider value={{ state, dispatch }}>{children}</DesignStoreContext.Provider>;
}

export function useDesignStore(): DesignStoreContextValue {
  const context = useContext(DesignStoreContext);
  if (!context) {
    throw new Error('useDesignStore must be used within DesignStoreProvider');
  }

  return context;
}
