// src/context/PaywallContext.tsx

'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PaywallContextProps {
  showOverlay: boolean;
  setShowOverlay: (value: boolean) => void;
}

const PaywallContext = createContext<PaywallContextProps | undefined>(undefined);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [showOverlay, setShowOverlay] = useState(false);
  return (
    <PaywallContext.Provider value={{ showOverlay, setShowOverlay }}>
      {children}
    </PaywallContext.Provider>
  );
}

export function usePaywallContext() {
  const context = useContext(PaywallContext);
  if (!context) {
    throw new Error('usePaywallContext must be used within PaywallProvider');
  }
  return context;
}
