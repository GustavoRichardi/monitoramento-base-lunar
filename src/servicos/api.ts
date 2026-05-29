// src/servicos/api.ts
// Cliente HTTP centralizado da aplicação.
// Toda comunicação com o backend Spring Boot passa por este módulo.
//
// Responsabilidades desta camada:
//  - URL base configurável (dev/produção)
//  - Timeout obrigatório (nenhuma requisição pende para sempre)
//  - Normalização de QUALQUER falha em um contrato de erro único e tipado
//  - Garantia de que falha de rede NUNCA derruba o app (erro vira valor)

/**
 * URL base do backend Spring Boot.
 * Em produção deve vir de variável de ambiente.
 * O fallback localhost cobre o ambiente de desenvolvimento.
 *
 * Observação: no React Native, "localhost" aponta para o próprio dispositivo.
 * Para testar no emulador Android, usa-se geralmente 10.0.2.2 no lugar de localhost.
 */
const URL_BASE_API =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

/** Tempo máximo (ms) que uma requisição pode pender antes de ser abortada. */
const TIMEOUT_PADRAO_MS = 10_000;

/**
 * Categorias de erro normalizadas.
 * Todo erro cru (timeout, 5xx, DNS, sem conexão) é mapeado para uma destas.
 * O restante do app só lida com este contrato — nunca com o erro bruto do fetch.
 */
export enum TipoErroApi {
  REDE = 'REDE', // Backend offline, sem conexão, falha de DNS
  TIMEOUT = 'TIMEOUT', // Requisição excedeu o tempo limite
  SERVIDOR = 'SERVIDOR', // 5xx — backend respondeu com erro interno
  REQUISICAO = 'REQUISICAO', // 4xx — erro do cliente (validação, não encontrado)
  AUTENTICACAO = 'AUTENTICACAO', // 401 / 403
  DESCONHECIDO = 'DESCONHECIDO', // Qualquer falha não classificada
}

/**
 * Contrato único de erro exposto a toda a aplicação.
 * `recuperavel` indica se uma nova tentativa (retry) faz sentido.
 */
export interface ErroApi {
  tipo: TipoErroApi;
  mensagem: string; // Mensagem amigável, pronta para exibir ao operador
  statusHttp?: number; // Código HTTP, quando houver resposta
  recuperavel: boolean; // true para falhas transitórias (rede, timeout, 5xx)
}

/**
 * Resultado padronizado de qualquer chamada à API.
 * Em vez de lançar exceção, retornamos um Result — a falha vira valor,
 * não exceção. É isto que impede o app de "fechar sozinho".
 * O chamador inspeciona `sucesso` para decidir o fluxo.
 */
export type ResultadoApi<T> =
  | { sucesso: true; dados: T }
  | { sucesso: false; erro: ErroApi };

/**
 * Traduz uma falha bruta no contrato ErroApi, com mensagem amigável.
 */
function normalizarErro(erro: unknown, statusHttp?: number): ErroApi {
  // Timeout disparado pelo AbortController
  if (erro instanceof DOMException && erro.name === 'AbortError') {
    return {
      tipo: TipoErroApi.TIMEOUT,
      mensagem:
        'O servidor demorou para responder. Verifique a conexão e tente novamente.',
      recuperavel: true,
    };
  }

  // Falha de rede do fetch (backend offline ou sem internet).
  // O fetch lança TypeError nesses casos.
  if (erro instanceof TypeError) {
    return {
      tipo: TipoErroApi.REDE,
      mensagem:
        'Não foi possível conectar ao servidor. O backend pode estar indisponível.',
      recuperavel: true,
    };
  }

  // Erros com status HTTP (resposta recebida, mas não-ok)
  if (statusHttp) {
    if (statusHttp === 401 || statusHttp === 403) {
      return {
        tipo: TipoErroApi.AUTENTICACAO,
        mensagem: 'Sessão expirada ou acesso negado. Faça login novamente.',
        statusHttp,
        recuperavel: false,
      };
    }
    if (statusHttp >= 500) {
      return {
        tipo: TipoErroApi.SERVIDOR,
        mensagem:
          'O servidor encontrou um erro interno. Tente novamente em instantes.',
        statusHttp,
        recuperavel: true,
      };
    }
    if (statusHttp >= 400) {
      return {
        tipo: TipoErroApi.REQUISICAO,
        mensagem: 'A requisição não pôde ser processada pelo servidor.',
        statusHttp,
        recuperavel: false,
      };
    }
  }

  return {
    tipo: TipoErroApi.DESCONHECIDO,
    mensagem: 'Ocorreu um erro inesperado. Tente novamente.',
    recuperavel: false,
  };
}

/**
 * Executa uma requisição com timeout via AbortController.
 * Garante que nenhuma chamada penda indefinidamente caso o backend trave.
 */
async function requisicaoComTimeout(
  url: string,
  opcoes: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    return await fetch(url, { ...opcoes, signal: controlador.signal });
  } finally {
    // Sempre limpa o timer — evita vazamento mesmo em caso de sucesso.
    clearTimeout(temporizador);
  }
}

/**
 * Núcleo do cliente: executa a requisição, trata a resposta e
 * SEMPRE retorna um ResultadoApi. Nunca propaga exceção ao chamador.
 *
 * @param caminho  Caminho relativo do endpoint (ex.: '/recursos').
 * @param opcoes   Opções do fetch (method, headers, body).
 */
async function executarRequisicao<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<ResultadoApi<T>> {
  const url = `${URL_BASE_API}${caminho}`;

  try {
    const resposta = await requisicaoComTimeout(
      url,
      {
        ...opcoes,
        headers: {
          'Content-Type': 'application/json',
          ...opcoes.headers,
        },
      },
      TIMEOUT_PADRAO_MS,
    );

    // Resposta recebida, mas com status de erro (4xx / 5xx)
    if (!resposta.ok) {
      return { sucesso: false, erro: normalizarErro(null, resposta.status) };
    }

    // 204 No Content — sucesso sem corpo de resposta
    if (resposta.status === 204) {
      return { sucesso: true, dados: undefined as T };
    }

    const dados = (await resposta.json()) as T;
    return { sucesso: true, dados };
  } catch (erro) {
    // Captura timeout, falha de rede e qualquer exceção do fetch/parse.
    // É AQUI que o crash é contido: o erro morre como valor de retorno.
    return { sucesso: false, erro: normalizarErro(erro) };
  }
}

/**
 * Interface pública do cliente HTTP.
 * Os serviços de cada feature consomem estes métodos.
 *
 * A GS exige consumo via GET e POST — ambos cobertos abaixo
 * (PUT e DELETE incluídos para completar o CRUD do cadastro).
 */
export const clienteApi = {
  get: <T>(caminho: string) =>
    executarRequisicao<T>(caminho, { method: 'GET' }),

  post: <T>(caminho: string, corpo: unknown) =>
    executarRequisicao<T>(caminho, {
      method: 'POST',
      body: JSON.stringify(corpo),
    }),

  put: <T>(caminho: string, corpo: unknown) =>
    executarRequisicao<T>(caminho, {
      method: 'PUT',
      body: JSON.stringify(corpo),
    }),

  delete: <T>(caminho: string) =>
    executarRequisicao<T>(caminho, { method: 'DELETE' }),
};