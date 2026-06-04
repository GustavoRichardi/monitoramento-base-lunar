// src/servicos/recursoServico.ts
// Camada de serviço dos recursos da Base Lunar.

import { clienteApi, ResultadoApi } from './api';
import { Recurso, NovoRecurso, StatusRecurso, TipoRecurso } from '../tipos/recursos';

const USAR_MOCK_EM_FALHA = true;

export type RecursoComOrigem = Recurso & { origemSimulada?: boolean };

const ROTA_RECURSOS = '/recursos';

// Memória temporária: guarda os recursos cadastrados durante a sessão.
const recursosCadastradosNaSessao: RecursoComOrigem[] = [];

// Snapshot atual dos recursos.
let leituraAtual: RecursoComOrigem[] = [];

// Gera um número aleatório dentro de uma faixa.
function aleatorio(min: number, max: number, decimais = 0): number {
  const valor = Math.random() * (max - min) + min;
  return Number(valor.toFixed(decimais));
}

// Calcula o status com base no tipo e nos níveis (regra direcional).
function calcularStatus(tipo: TipoRecurso, nivelAtual: number, nivelCritico: number): StatusRecurso {
  if (tipo === TipoRecurso.CLIMATIZACAO) {
    if (nivelAtual > nivelCritico) return StatusRecurso.CRITICO;
    if (nivelAtual > nivelCritico - 3) return StatusRecurso.ATENCAO;
    return StatusRecurso.NORMAL;
  } else {
    if (nivelAtual < nivelCritico) return StatusRecurso.CRITICO;
    if (nivelAtual < nivelCritico + 10) return StatusRecurso.ATENCAO;
    return StatusRecurso.NORMAL;
  }
}

// Cena inicial fixa (mantém a apresentação com 2 críticos garantidos no primeiro carregamento).
function gerarRecursosIniciais(): RecursoComOrigem[] {
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

// Gera leitura ALEATÓRIA dos 3 recursos com valores realistas.
function gerarLeituraAleatoria(): RecursoComOrigem[] {
  const agora = new Date().toISOString();

  const nivelAgua = aleatorio(5, 95);
  const nivelEnergia = aleatorio(10, 100);
  const tempClima = aleatorio(18, 50, 1);

  return [
    {
      id: 'mock-agua-01',
      tipo: TipoRecurso.AGUA,
      status: calcularStatus(TipoRecurso.AGUA, nivelAgua, 20),
      nivelAtual: nivelAgua,
      nivelCritico: 20,
      dataLeitura: agora,
      localizacaoSensor: 'Reservatório Principal - Módulo A',
      unidadeMedida: '%',
      capacidadeReservatorioLitros: 5000,
      percentualPotavel: aleatorio(40, 90),
      taxaReciclagemLitrosHora: aleatorio(5, 20),
      origemSimulada: true,
    },
    {
      id: 'mock-energia-01',
      tipo: TipoRecurso.ENERGIA,
      status: calcularStatus(TipoRecurso.ENERGIA, nivelEnergia, 25),
      nivelAtual: nivelEnergia,
      nivelCritico: 25,
      dataLeitura: agora,
      localizacaoSensor: 'Banco de Baterias - Setor Solar',
      unidadeMedida: '%',
      geracaoSolarKw: aleatorio(20, 60, 1),
      consumoAtualKw: aleatorio(15, 50, 1),
      capacidadeBateriaKwh: 200,
      emModoReserva: nivelEnergia < 30,
      origemSimulada: true,
    },
    {
      id: 'mock-clima-01',
      tipo: TipoRecurso.CLIMATIZACAO,
      status: calcularStatus(TipoRecurso.CLIMATIZACAO, tempClima, 30),
      nivelAtual: tempClima,
      nivelCritico: 30,
      dataLeitura: agora,
      localizacaoSensor: 'Controle Térmico - Habitat 2',
      unidadeMedida: '°C',
      temperaturaCelsius: tempClima,
      nivelOxigenio: aleatorio(18, 22, 1),
      nivelCo2Ppm: aleatorio(400, 1200),
      pressaoInternaKpa: aleatorio(98, 104, 1),
      origemSimulada: true,
    },
  ];
}

function gerarRecursoCadastradoFicticio(dados: NovoRecurso): RecursoComOrigem {
  const status = calcularStatus(dados.tipo, dados.nivelAtual, dados.nivelCritico);

  return {
    ...dados,
    id: `mock-${Date.now()}`,
    status,
    dataLeitura: new Date().toISOString(),
    origemSimulada: true,
  } as RecursoComOrigem;
}

// Solicita uma simulação de leitura nova (botão da tela chama aqui).
export function simularNovaLeitura(): void {
  leituraAtual = gerarLeituraAleatoria();
}

export async function obterRecursos(): Promise<ResultadoApi<RecursoComOrigem[]>> {
  const resultado = await clienteApi.get<RecursoComOrigem[]>(ROTA_RECURSOS);

  if (resultado.sucesso) {
    return resultado;
  }

  if (USAR_MOCK_EM_FALHA) {
    console.warn('[recursoServico] API indisponível — retornando dados fictícios.', resultado.erro);
    if (leituraAtual.length === 0) {
      leituraAtual = gerarRecursosIniciais();
    }
    const todosRecursos = [...leituraAtual, ...recursosCadastradosNaSessao];
    return { sucesso: true, dados: todosRecursos };
  }

  return resultado;
}

export async function cadastrarRecurso(dados: NovoRecurso): Promise<ResultadoApi<RecursoComOrigem>> {
  const resultado = await clienteApi.post<RecursoComOrigem>(ROTA_RECURSOS, dados);

  if (resultado.sucesso) {
    return resultado;
  }

  if (USAR_MOCK_EM_FALHA) {
    console.warn('[recursoServico] API indisponível — simulando cadastro fictício.', resultado.erro);
    const novoRecurso = gerarRecursoCadastradoFicticio(dados);
    recursosCadastradosNaSessao.push(novoRecurso);
    return { sucesso: true, dados: novoRecurso };
  }

  return resultado;
}
