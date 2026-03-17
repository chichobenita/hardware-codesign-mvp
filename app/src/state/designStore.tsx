import { createContext, useContext, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { DesignState } from '../types';
import type { DesignAction } from './designActions';
import { designReducer, seedState } from './designReducer';

type DesignStoreContextValue = {
  state: DesignState;
  dispatch: React.Dispatch<DesignAction>;
};

const DesignStoreContext = createContext<DesignStoreContextValue | null>(null);

type DesignStoreProviderProps = {
  children: ReactNode;
  initialState?: DesignState;
};

export function DesignStoreProvider({ children, initialState = seedState }: DesignStoreProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(designReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <DesignStoreContext.Provider value={value}>{children}</DesignStoreContext.Provider>;
}

export function useDesignStore(): DesignStoreContextValue {
  const context = useContext(DesignStoreContext);
  if (!context) {
    throw new Error('useDesignStore must be used within DesignStoreProvider');
  }

  return context;
}
