import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type CursorVariant = 'default' | 'scroll-y' | 'scroll-x' | 'expand' | 'hidden' | 'loading';

interface CursorContextValue {
  variant: CursorVariant;
  setVariant: (v: CursorVariant) => void;
}

const CursorContext = createContext<CursorContextValue | undefined>(undefined);

interface CursorProviderProps {
  children: ReactNode;
}

export const CursorProvider: React.FC<CursorProviderProps> = ({ children }) => {
  const [variant, setVariant] = useState<CursorVariant>('loading');

  return (
    <CursorContext.Provider value={{ variant, setVariant }}>
      {children}
    </CursorContext.Provider>
  );
};

export const useCursor = (): CursorContextValue => {
  const context = useContext(CursorContext);
  if (!context) {
    throw new Error('useCursor must be used within a CursorProvider');
  }
  return context;
};
