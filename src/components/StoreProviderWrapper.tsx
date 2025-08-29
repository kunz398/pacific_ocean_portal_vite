import React from 'react';
import StoreProvider from '../GlobalRedux/provider'; // Adjust the path as needed

export default function StoreProviderWrapper({ children }) {
  return (
    <StoreProvider>
      {children}
    </StoreProvider>
  );
}