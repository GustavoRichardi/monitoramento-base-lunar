// src/navegacao/AppNavegacao.tsx
// Configuração central de navegação do app.

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { TelaMonitoramento } from '../telas/TelaMonitoramento';
import { TelaCadastro } from '../telas/TelaCadastro';

export type ParamsPilhaApp = {
  Monitoramento: undefined;
  Cadastro: undefined;
};

export type PropsTelaMonitoramento = NativeStackScreenProps<ParamsPilhaApp, 'Monitoramento'>;
export type PropsTelaCadastro = NativeStackScreenProps<ParamsPilhaApp, 'Cadastro'>;

const Pilha = createNativeStackNavigator<ParamsPilhaApp>();

export function AppNavegacao(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Pilha.Navigator
        initialRouteName="Monitoramento"
        screenOptions={{
          headerStyle: { backgroundColor: '#0B1F3A' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Pilha.Screen
          name="Monitoramento"
          component={TelaMonitoramento}
          options={{ title: 'Monitoramento da Base' }}
        />
        <Pilha.Screen
          name="Cadastro"
          component={TelaCadastro}
          options={{ title: 'Cadastrar Recurso' }}
        />
      </Pilha.Navigator>
    </NavigationContainer>
  );
}