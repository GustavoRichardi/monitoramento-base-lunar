// src/servicos/recursoServico.ts
// Camada de serviço dos recursos da Base Lunar.
// É a fronteira que as telas/hooks chamam — elas NUNCA falam com o clienteApi
// diretamente. Aqui tipamos os endpoints concretos e aplicamos a política de mock.

import { clienteApi, ResultadoApi } from './api';
import {
  Recurso,
  NovoRecurso,
  StatusRecurso,
  TipoRecurso,
} from '../tipos/recursos';

const USAR_MOCK_EM_FALHA = true;

export type RecursoComOrigem = Recurso & { origemSimulada?: boolean };

const ROTA_RECURSOS = '/recursos';

function gerarRecursosFicticios(): RecursoComOrigem[] {
  const agora = new Date().toISOString();

  return [
    {
      id: 'mock-agua-01',
      tipo: TipoRecurso.AGUA,
      status: StatusRecurso.CRITICO,
      nivelAtual: 15,
      nivelCritico: 20,
      dataLeitura: agora,
      localizacaoSensor: 'Reservatório Principal - Módulo A',
      unidadeMedida: '%',
      capacidadeReservatorioLitros: 5000,
      percentualPotavel: 60,
      taxaReciclagemLitrosHora: 12,
      origemSimulada: true,
    },
    {
      id: 'mock-energia-01',
      tipo: TipoRecurso.ENERGIA,
      status: StatusRecurso.NORMAL,
      nivelAtual: 82,
      nivelCritico: 25,
      dataLeitura: agora,
      localizacaoSensor: 'Banco de Baterias - Setor Solar',
      unidadeMedida: '%',
      geracaoSolarKw: 48.5,
      consumoAtualKw: 31.2,
      capacidadeBateriaKwh: 200,
      emModoReserva: false,
      origemSimulada: true,
    },
    {
      id: 'mock-clima-01',
      tipo: TipoRecurso.CLIMATIZACAO,
      status: StatusRecurso.CRITICO,
      nivelAtual: 45,
      nivelCritico: 30,
      dataLeitura: agora,
      localizacaoSensor: 'Controle Térmico - Habitat 2',
      unidadeMedida: '°C',
      temperaturaCelsius: 45,
      nivelOxigenio: 20.9,
      nivelCo2Ppm: 850,
      pressaoInternaKpa: 101.3,
      origemSimulada: true,
    },
  ];
}

function gerarRecursoCadastradoFicticio(
  dados: NovoRecurso,
): RecursoComOrigem {
  return {
    ...dados,
    id: `mock-${Date.now()}`,
    status: StatusRecurso.NORMAL,
    dataLeitura: new Date().toISOString(),
    origemSimulada: true,
  } as RecursoComOrigem;
}

export async function obterRecursos(): Promise<ResultadoApi<RecursoComOrigem[]>> {
  const resultado = await clienteApi.get<RecursoComOrigem[]>(ROTA_RECURSOS);

  if (resultado.sucesso) {
    return resultado;
  }

  if (USAR_MOCK_EM_FALHA) {
    console.warn(
      '[recursoServico] API indisponível — retornando dados fictícios de teste.',
      resultado.erro,
    );
    return { sucesso: true, dados: gerarRecursosFicticios() };
  }

  return resultado;
}

export async function cadastrarRecurso(
  dados: NovoRecurso,
): Promise<ResultadoApi<RecursoComOrigem>> {
  const resultado = await clienteApi.post<RecursoComOrigem>(
    ROTA_RECURSOS,
    dados,
  );

  if (resultado.sucesso) {
    return resultado;
  }

  if (USAR_MOCK_EM_FALHA) {
    console.warn(
      '[recursoServico] API indisponível — simulando cadastro fictício.',
      resultado.erro,
    );
    return { sucesso: true, dados: gerarRecursoCadastradoFicticio(dados) };
  }

  return resultado;
}