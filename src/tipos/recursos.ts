// src/tipos/recursos.ts
// Contratos de domínio para os recursos críticos da Base Lunar.
// Fonte única de verdade consumida pelos hooks, serviços e telas.
//
// Recursos exigidos pela GS (FIAP): Água, Energia e Climatização.

/**
 * Classificação operacional de um recurso no momento da leitura.
 * Usada para priorizar alertas e ordenar a fila de criticidade.
 */
export enum StatusRecurso {
  NORMAL = 'NORMAL',
  ATENCAO = 'ATENCAO', // Aproximando-se do nível crítico
  CRITICO = 'CRITICO', // Atingiu/ultrapassou o limite seguro — exige ação
  OFFLINE = 'OFFLINE', // Sensor não está reportando leituras
}

/**
 * Tipos de recurso monitorados na base lunar.
 * Atua como discriminador para as interfaces especializadas abaixo.
 */
export enum TipoRecurso {
  AGUA = 'AGUA',
  ENERGIA = 'ENERGIA',
  CLIMATIZACAO = 'CLIMATIZACAO',
}

/**
 * Propriedades comuns a todo recurso monitorado.
 * As interfaces específicas de cada recurso estendem esta base.
 */
export interface RecursoBase {
  /** Identificador único do recurso no backend. */
  id: string;
  /** Discriminador de tipo — permite narrowing seguro em TypeScript. */
  tipo: TipoRecurso;
  /** Status operacional derivado da última leitura. */
  status: StatusRecurso;
  /** Valor lido pelo sensor, na unidade do recurso. */
  nivelAtual: number;
  /** Limite a partir do qual o recurso é considerado crítico. */
  nivelCritico: number;
  /** Timestamp ISO 8601 da última leitura recebida. */
  dataLeitura: string;
  /** Identificador físico/lógico do sensor de origem. */
  localizacaoSensor: string;
  /** Unidade de medida do nivelAtual (ex.: '%', 'kW', 'kPa'). */
  unidadeMedida: string;
}

/**
 * Recurso hídrico — reservatórios e reciclagem de água.
 */
export interface RecursoAgua extends RecursoBase {
  tipo: TipoRecurso.AGUA;
  /** Capacidade total do reservatório em litros. */
  capacidadeReservatorioLitros: number;
  /** Percentual de água potável vs. água em reciclagem (0–100). */
  percentualPotavel: number;
  /** Taxa de reciclagem atual em litros/hora. */
  taxaReciclagemLitrosHora: number;
}

/**
 * Recurso energético — geração e armazenamento elétrico.
 */
export interface RecursoEnergia extends RecursoBase {
  tipo: TipoRecurso.ENERGIA;
  /** Geração instantânea dos painéis solares em kW. */
  geracaoSolarKw: number;
  /** Consumo total da base em kW. */
  consumoAtualKw: number;
  /** Capacidade total do banco de baterias em kWh. */
  capacidadeBateriaKwh: number;
  /** Indica se a base está operando apenas com reserva de bateria. */
  emModoReserva: boolean;
}

/**
 * Recurso de climatização — pressurização, oxigênio e temperatura.
 */
export interface RecursoClimatizacao extends RecursoBase {
  tipo: TipoRecurso.CLIMATIZACAO;
  /** Temperatura interna do módulo em graus Celsius. */
  temperaturaCelsius: number;
  /** Concentração de oxigênio em percentual (0–100). */
  nivelOxigenio: number;
  /** Concentração de CO₂ em partes por milhão (ppm). */
  nivelCo2Ppm: number;
  /** Pressão interna do módulo em kilopascals (kPa). */
  pressaoInternaKpa: number;
}

/**
 * União discriminada de todos os recursos.
 * O campo `tipo` permite ao TypeScript estreitar o tipo automaticamente:
 *
 *   if (recurso.tipo === TipoRecurso.AGUA) {
 *     // aqui recurso é RecursoAgua e expõe percentualPotavel
 *   }
 */
export type Recurso = RecursoAgua | RecursoEnergia | RecursoClimatizacao;

/**
 * Payload de criação/cadastro de um recurso (usado no POST).
 * Omite campos gerados/derivados pelo backend: id, status e dataLeitura.
 */
export type NovoRecurso = Omit<Recurso, 'id' | 'status' | 'dataLeitura'>;