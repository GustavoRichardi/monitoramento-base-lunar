// src/telas/TelaMonitoramento.tsx
// Tela principal do app: exibe o status operacional de Água, Energia e
// Climatização em cartões, com destaque visual claro para níveis críticos.
//
// Regras atendidas:
//  - useEffect dispara obterRecursos() ao abrir a tela
//  - useState armazena dados, carregamento e erro
//  - Cards por recurso + faixa/banner de alerta crítico

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';

import { obterRecursos, RecursoComOrigem } from '../servicos/recursoServico';
import { ErroApi } from '../servicos/api';
import { StatusRecurso, TipoRecurso } from '../tipos/recursos';
import { PropsTelaMonitoramento } from '../navegacao/AppNavegacao';

// ---------------------------------------------------------------------------
// LÓGICA DE ALERTA OPERACIONAL (separada da renderização)
// ---------------------------------------------------------------------------
//
// Por que isto não vive dentro do JSX: a criticidade é DIRECIONAL.
// Água é crítica ABAIXO de um limite; Climatização é crítica ACIMA dele.
// Uma única comparação não serve aos dois. Centralizar aqui torna a regra
// testável e mantém os cards "burros" (apenas exibem o que recebem).
//
// Fonte de verdade primária: o campo `status` que o serviço/backend já
// calculou. Os limites por valor abaixo são um reforço de apresentação,
// usados para montar a mensagem — não para sobrepor o status oficial.

interface AvaliacaoCriticidade {
  emAlerta: boolean;
  mensagem: string | null;
}

function avaliarCriticidade(recurso: RecursoComOrigem): AvaliacaoCriticidade {
  // 1) O status calculado pelo serviço manda. Se já veio CRITICO, é alerta.
  const criticoPorStatus = recurso.status === StatusRecurso.CRITICO;

  // 2) Reforço por valor bruto, respeitando a direção de cada recurso.
  let criticoPorValor = false;
  let mensagem: string | null = null;

  switch (recurso.tipo) {
    case TipoRecurso.AGUA:
      criticoPorValor = recurso.nivelAtual < recurso.nivelCritico;
      mensagem = `Nível de água crítico: ${recurso.nivelAtual}% (mínimo seguro ${recurso.nivelCritico}%)`;
      break;
    case TipoRecurso.CLIMATIZACAO:
      criticoPorValor = recurso.nivelAtual > recurso.nivelCritico;
      mensagem = `Temperatura crítica: ${recurso.nivelAtual}°C (máximo seguro ${recurso.nivelCritico}°C)`;
      break;
    case TipoRecurso.ENERGIA:
      criticoPorValor = recurso.nivelAtual < recurso.nivelCritico;
      mensagem = `Carga de energia crítica: ${recurso.nivelAtual}% (mínimo seguro ${recurso.nivelCritico}%)`;
      break;
  }

  const emAlerta = criticoPorStatus || criticoPorValor;
  return { emAlerta, mensagem: emAlerta ? mensagem : null };
}

// Rótulo amigável por tipo de recurso.
const ROTULO_RECURSO: Record<TipoRecurso, string> = {
  [TipoRecurso.AGUA]: 'Água',
  [TipoRecurso.ENERGIA]: 'Energia',
  [TipoRecurso.CLIMATIZACAO]: 'Climatização',
};

// ---------------------------------------------------------------------------
// SUBCOMPONENTE: Cartão de recurso
// ---------------------------------------------------------------------------

interface PropsCartaoRecurso {
  recurso: RecursoComOrigem;
}

function CartaoRecurso({ recurso }: PropsCartaoRecurso): React.JSX.Element {
  const { emAlerta, mensagem } = avaliarCriticidade(recurso);

  return (
    <View
      style={[estilos.cartao, emAlerta && estilos.cartaoCritico]}
      accessibilityRole="summary"
    >
      {/* Faixa vermelha de alerta — só aparece em estado crítico */}
      {emAlerta && (
        <View style={estilos.faixaAlerta}>
          <Text style={estilos.iconeAlerta}>⚠️</Text>
          <Text style={estilos.textoAlerta}>{mensagem}</Text>
        </View>
      )}

      <View style={estilos.cabecalhoCartao}>
        <Text style={estilos.tituloCartao}>{ROTULO_RECURSO[recurso.tipo]}</Text>
        <Text style={[estilos.selo, corDoStatus(recurso.status)]}>
          {recurso.status}
        </Text>
      </View>

      <Text style={estilos.valorPrincipal}>
        {recurso.nivelAtual}
        <Text style={estilos.unidade}> {recurso.unidadeMedida}</Text>
      </Text>

      <Text style={estilos.detalhe}>Sensor: {recurso.localizacaoSensor}</Text>
      <Text style={estilos.detalhe}>
        Limite crítico: {recurso.nivelCritico} {recurso.unidadeMedida}
      </Text>

      {/* Selo discreto indicando dado simulado (mock), quando aplicável */}
      {recurso.origemSimulada && (
        <Text style={estilos.seloSimulado}>● dados de teste (simulados)</Text>
      )}
    </View>
  );
}

// Mapeia status -> cor do selo.
function corDoStatus(status: StatusRecurso) {
  switch (status) {
    case StatusRecurso.CRITICO:
      return { backgroundColor: '#C0392B', color: '#FFFFFF' };
    case StatusRecurso.ATENCAO:
      return { backgroundColor: '#E67E22', color: '#FFFFFF' };
    case StatusRecurso.OFFLINE:
      return { backgroundColor: '#7F8C8D', color: '#FFFFFF' };
    case StatusRecurso.NORMAL:
    default:
      return { backgroundColor: '#27AE60', color: '#FFFFFF' };
  }
}

// ---------------------------------------------------------------------------
// TELA PRINCIPAL
// ---------------------------------------------------------------------------

export function TelaMonitoramento({
  navigation,
}: PropsTelaMonitoramento): React.JSX.Element {
  // Estado tipado: o tripé dados / carregando / erro.
  const [recursos, setRecursos] = useState<RecursoComOrigem[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [atualizando, setAtualizando] = useState<boolean>(false);

  // Função de carga reutilizável (montagem inicial + pull-to-refresh).
  const carregarRecursos = useCallback(async () => {
    setErro(null);
    const resultado = await obterRecursos();
    if (resultado.sucesso) {
      setRecursos(resultado.dados);
    } else {
      setErro(resultado.erro);
    }
  }, []);

  // useEffect: dispara a busca assim que a tela abre.
  // O flag `ativo` evita atualizar estado se a tela desmontar antes da resposta.
  useEffect(() => {
    let ativo = true;

    (async () => {
      setCarregando(true);
      const resultado = await obterRecursos();
      if (!ativo) return;
      if (resultado.sucesso) {
        setRecursos(resultado.dados);
      } else {
        setErro(resultado.erro);
      }
      setCarregando(false);
    })();

    return () => {
      ativo = false;
    };
  }, []);

  // Pull-to-refresh.
  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);
    await carregarRecursos();
    setAtualizando(false);
  }, [carregarRecursos]);

  // Quantidade de recursos em alerta — alimenta o banner global do topo.
  const recursosEmAlerta = recursos.filter(
    (r) => avaliarCriticidade(r).emAlerta,
  );

  // Estado de carregamento inicial.
  if (carregando) {
    return (
      <View style={estilos.centralizado}>
        <ActivityIndicator size="large" color="#0B1F3A" />
        <Text style={estilos.textoCarregando}>Lendo sensores da base...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} />
      }
    >
      {/* Banner global de erro real (só aparece com mock desligado) */}
      {erro && (
        <View style={estilos.bannerErro}>
          <Text style={estilos.textoBannerErro}>{erro.mensagem}</Text>
          <TouchableOpacity onPress={carregarRecursos} style={estilos.botaoRetry}>
            <Text style={estilos.textoBotaoRetry}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Banner global de alerta operacional, no topo da tela */}
      {recursosEmAlerta.length > 0 && (
        <View style={estilos.bannerCriticoGlobal}>
          <Text style={estilos.textoBannerCritico}>
            ⚠️ {recursosEmAlerta.length} recurso(s) em estado crítico — ação
            imediata necessária
          </Text>
        </View>
      )}

      {/* Cartões dos recursos */}
      {recursos.map((recurso) => (
        <CartaoRecurso key={recurso.id} recurso={recurso} />
      ))}

      {/* Atalho para a tela de cadastro */}
      <TouchableOpacity
        style={estilos.botaoCadastro}
        onPress={() => navigation.navigate('Cadastro')}
      >
        <Text style={estilos.textoBotaoCadastro}>+ Cadastrar novo recurso</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// ESTILOS
// ---------------------------------------------------------------------------

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  conteudo: {
    padding: 16,
    paddingBottom: 40,
  },
  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
  },
  textoCarregando: {
    marginTop: 12,
    color: '#0B1F3A',
    fontSize: 15,
  },
  // Banner global crítico
  bannerCriticoGlobal: {
    backgroundColor: '#C0392B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  textoBannerCritico: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  // Banner de erro real
  bannerErro: {
    backgroundColor: '#FDECEA',
    borderColor: '#C0392B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  textoBannerErro: {
    color: '#922B21',
    fontSize: 14,
    marginBottom: 8,
  },
  botaoRetry: {
    alignSelf: 'flex-start',
    backgroundColor: '#C0392B',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  textoBotaoRetry: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Cartões
  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  cartaoCritico: {
    borderColor: '#C0392B',
    borderWidth: 2,
  },
  faixaAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C0392B',
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iconeAlerta: {
    fontSize: 16,
    marginRight: 8,
  },
  textoAlerta: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    flexShrink: 1,
  },
  cabecalhoCartao: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tituloCartao: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B1F3A',
  },
  selo: {
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  valorPrincipal: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0B1F3A',
    marginBottom: 8,
  },
  unidade: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D6D7E',
  },
  detalhe: {
    fontSize: 13,
    color: '#5D6D7E',
    marginBottom: 2,
  },
  seloSimulado: {
    marginTop: 8,
    fontSize: 11,
    color: '#B7950B',
    fontStyle: 'italic',
  },
  // Botão de cadastro
  botaoCadastro: {
    backgroundColor: '#0B1F3A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  textoBotaoCadastro: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});