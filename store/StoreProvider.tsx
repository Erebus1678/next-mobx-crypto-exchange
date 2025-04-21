'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { exchangeStore } from './ExchangeStore'

const StoreContext = createContext(exchangeStore)

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  return <StoreContext.Provider value={exchangeStore}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return store
}
