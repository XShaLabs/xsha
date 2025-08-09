import React, { createContext, useContext, useState } from 'react';

interface PageActionsContextType {
  actions: React.ReactNode | null;
  setActions: (actions: React.ReactNode | null) => void;
}

const PageActionsContext = createContext<PageActionsContextType | undefined>(undefined);

export function PageActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<React.ReactNode | null>(null);

  return (
    <PageActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </PageActionsContext.Provider>
  );
}

export function usePageActions() {
  const context = useContext(PageActionsContext);
  if (!context) {
    throw new Error('usePageActions must be used within a PageActionsProvider');
  }
  return context;
}
