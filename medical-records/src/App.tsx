// src/App.tsx

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores';
import AppRouter from '@/routes/AppRouter';
import { LoadingOverlay } from '@/components/ui';

function App() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return <LoadingOverlay>Verificando autenticación...</LoadingOverlay>;
  }

  return <AppRouter />;
}

export default App;