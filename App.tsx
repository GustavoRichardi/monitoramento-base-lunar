// App.tsx
// Ponto de entrada do aplicativo.
// Apenas renderiza a navegação raiz — toda a lógica vive abaixo dela.

import React from 'react';
import { AppNavegacao } from './src/navegacao/AppNavegacao';

export default function App(): React.JSX.Element {
  return <AppNavegacao />;
}