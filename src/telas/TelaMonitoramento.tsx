// src/telas/TelaMonitoramento.tsx
// Tela principal com estilo sci-fi (Space Vibe).

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';

import { obterRecursos, simularNovaLeitura, RecursoComOrigem } from '../servicos/recursoServico';
import { ErroApi } from '../servicos/api';
import { StatusRecurso, TipoRecurso } from '../tipos/recursos';
import { PropsTelaMonitoramento } from '../navegacao/AppNavegacao';

const CORES = {
  fundoEspaco: '#0B0D17',
  painelVidro: 'rgba(20, 25, 45, 0.6)',
  bordaPainel: 'rgba(120, 180, 255, 0.15)',
  cianoNeon: '#00E5FF',
  roxoNebulosa: '#9B59FF',
  laranjaAlerta: '#FF7A33',
  vermelhoCritico: '#FF2D6A',
  verdeNormal: '#27FFB2',
  textoPrincipal: '#E6ECFF',
  textoSecundario: '#8A92B2',
  textoTecnico: '#5DD3FF',
};

function avaliarCriticidade(recurso: RecursoComOrigem): { emAlerta: boolean; mensagem: string | null } {
  const criticoPorStatus = recurso.status === StatusRecurso.CRITICO;

  let criticoPorValor = false;
  let mensagem: string | null = null;

  switch (recurso.tipo) {
    case TipoRecurso.AGUA:
      criticoPorValor = recurso.nivelAtual < recurso.nivelCritico;
      mensagem = `H2O crítico: ${recurso.nivelAtual}% — mínimo seguro ${recurso.nivelCritico}%`;
      break;
    case TipoRecurso.CLIMATIZACAO:
      criticoPorValor = recurso.nivelAtual > recurso.nivelCritico;
      mensagem = `Temp. crítica: ${recurso.nivelAtual}°C — máximo seguro ${recurso.nivelCritico}°C`;
      break;
    case TipoRecurso.ENERGIA:
      criticoPorValor = recurso.nivelAtual < recurso.nivelCritico;
      mensagem = `Energia crítica: ${recurso.nivelAtual}% — mínimo seguro ${recurso.nivelCritico}%`;
      break;
  }

  const emAlerta = criticoPorStatus || criticoPorValor;
  return { emAlerta, mensagem: emAlerta ? mensagem : null };
}

const ROTULO_RECURSO: Record<TipoRecurso, string> = {
  [TipoRecurso.AGUA]: 'H2O · ÁGUA',
  [TipoRecurso.ENERGIA]: 'PWR · ENERGIA',
  [TipoRecurso.CLIMATIZACAO]: 'THM · CLIMA',
};

const ICONE_RECURSO: Record<TipoRecurso, string> = {
  [TipoRecurso.AGUA]: '💧',
  [TipoRecurso.ENERGIA]: '⚡',
  [TipoRecurso.CLIMATIZACAO]: '🌡',
};

function AnelProgresso({ valor, cor }: { valor: number; cor: string }): React.JSX.Element {
  const animacao = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animacao, {
      toValue: Math.min(valor, 100),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [valor]);

  const largura = animacao.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={estilos.anelContainer}>
      <View style={estilos.anelTrilha}>
        <Animated.View style={[estilos.anelPreenchido, { width: largura, backgroundColor: cor }]} />
      </View>
    </View>
  );
}

function CartaoRecurso({ recurso }: { recurso: RecursoComOrigem }): React.JSX.Element {
  const { emAlerta, mensagem } = avaliarCriticidade(recurso);
  const corStatus = corPorStatus(recurso.status);

  const valorBarra =
    recurso.tipo === TipoRecurso.CLIMATIZACAO
      ? Math.min((recurso.nivelAtual / 50) * 100, 100)
      : recurso.nivelAtual;

  return (
    <View style={[estilos.cartao, emAlerta && estilos.cartaoCritico]}>
      <View style={estilos.linhaCabecalho}>
        <Text style={estilos.iconeRecurso}>{ICONE_RECURSO[recurso.tipo]}</Text>
        <Text style={estilos.tituloCartao}>{ROTULO_RECURSO[recurso.tipo]}</Text>
        <View style={[estilos.selo, { backgroundColor: corStatus + '22', borderColor: corStatus }]}>
          <Text style={[estilos.textoSelo, { color: corStatus }]}>● {recurso.status}</Text>
        </View>
      </View>

      <View style={estilos.linhaValor}>
        <Text style={[estilos.valorPrincipal, { color: corStatus }]}>
          {recurso.nivelAtual}
          <Text style={estilos.unidade}>{recurso.unidadeMedida}</Text>
        </Text>
        <View style={estilos.detalhesDireita}>
          <Text style={estilos.detalheLabel}>LIMITE</Text>
          <Text style={estilos.detalheValor}>
            {recurso.nivelCritico}{recurso.unidadeMedida}
          </Text>
        </View>
      </View>

      <AnelProgresso valor={valorBarra} cor={corStatus} />

      <Text style={estilos.sensorLabel}>
        <Text style={estilos.sensorPrefix}>SENSOR » </Text>
        {recurso.localizacaoSensor}
      </Text>

      {emAlerta && (
        <View style={estilos.faixaAlerta}>
          <Text style={estilos.iconeAlerta}>⚠</Text>
          <Text style={estilos.textoAlerta}>{mensagem}</Text>
        </View>
      )}

      {recurso.origemSimulada && (
        <Text style={estilos.seloSimulado}>◉ leitura simulada</Text>
      )}
    </View>
  );
}

function corPorStatus(status: StatusRecurso): string {
  switch (status) {
    case StatusRecurso.CRITICO: return CORES.vermelhoCritico;
    case StatusRecurso.ATENCAO: return CORES.laranjaAlerta;
    case StatusRecurso.OFFLINE: return CORES.textoSecundario;
    case StatusRecurso.NORMAL:
    default: return CORES.cianoNeon;
  }
}

export function TelaMonitoramento({ navigation }: PropsTelaMonitoramento): React.JSX.Element {
  const [recursos, setRecursos] = useState<RecursoComOrigem[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [atualizando, setAtualizando] = useState<boolean>(false);

  const escalaSimular = useRef(new Animated.Value(1)).current;
  const escalaCadastro = useRef(new Animated.Value(1)).current;

  const animarPulso = (valor: Animated.Value) => {
    Animated.sequence([
      Animated.timing(valor, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(valor, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const carregarRecursos = useCallback(async () => {
    setErro(null);
    const resultado = await obterRecursos();
    if (resultado.sucesso) setRecursos(resultado.dados);
    else setErro(resultado.erro);
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      const resultado = await obterRecursos();
      if (!ativo) return;
      if (resultado.sucesso) setRecursos(resultado.dados);
      else setErro(resultado.erro);
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, []);

  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);
    await carregarRecursos();
    setAtualizando(false);
  }, [carregarRecursos]);

  const aoSimularLeitura = useCallback(async () => {
    animarPulso(escalaSimular);
    setAtualizando(true);
    simularNovaLeitura();
    await carregarRecursos();
    setAtualizando(false);
  }, [carregarRecursos]);

  const recursosEmAlerta = recursos.filter((r) => avaliarCriticidade(r).emAlerta);
  const cicloLunar = Math.floor((Date.now() / (1000 * 60 * 60 * 24)) % 100);

  if (carregando) {
    return (
      <View style={estilos.centralizado}>
        <ActivityIndicator size="large" color={CORES.cianoNeon} />
        <Text style={estilos.textoCarregando}>INICIALIZANDO SENSORES...</Text>
        <Text style={estilos.textoCarregandoSub}>// estabelecendo telemetria</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={aoAtualizar}
          tintColor={CORES.cianoNeon}
          colors={[CORES.cianoNeon]}
        />
      }
    >
      <View style={estilos.cabecalho}>
        <Text style={estilos.saudacao}>BEM-VINDO, COMANDANTE</Text>
        <Text style={estilos.cicloLunar}>● CICLO LUNAR : {cicloLunar.toString().padStart(3, '0')}</Text>
        <View style={estilos.linhaDivisora} />
      </View>

      {erro && (
        <View style={estilos.bannerErro}>
          <Text style={estilos.textoBannerErro}>{erro.mensagem}</Text>
          <TouchableOpacity onPress={carregarRecursos} style={estilos.botaoRetry}>
            <Text style={estilos.textoBotaoRetry}>↻ TENTAR NOVAMENTE</Text>
          </TouchableOpacity>
        </View>
      )}

      {recursosEmAlerta.length > 0 && (
        <View style={estilos.bannerCriticoGlobal}>
          <Text style={estilos.textoBannerCritico}>
            ⚠ {recursosEmAlerta.length} SISTEMA(S) EM ESTADO CRÍTICO
          </Text>
          <Text style={estilos.textoBannerCriticoSub}>
            // ação imediata necessária
          </Text>
        </View>
      )}

      <Animated.View style={{ transform: [{ scale: escalaSimular }] }}>
        <TouchableOpacity style={estilos.botaoSimular} onPress={aoSimularLeitura} activeOpacity={0.8}>
          <Text style={estilos.textoBotaoSimular}>⟳  SIMULAR NOVA LEITURA</Text>
        </TouchableOpacity>
      </Animated.View>

      {recursos.map((recurso) => (
        <CartaoRecurso key={recurso.id} recurso={recurso} />
      ))}

      <Animated.View style={{ transform: [{ scale: escalaCadastro }] }}>
        <TouchableOpacity
          style={estilos.botaoCadastro}
          onPress={() => { animarPulso(escalaCadastro); navigation.navigate('Cadastro'); }}
          activeOpacity={0.8}
        >
          <Text style={estilos.textoBotaoCadastro}>+ CADASTRAR NOVO RECURSO</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={estilos.rodape}>// MOON BASE TELEMETRY v1.0</Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.fundoEspaco },
  conteudo: { padding: 20, paddingBottom: 40 },
  centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CORES.fundoEspaco },
  textoCarregando: { marginTop: 16, color: CORES.cianoNeon, fontSize: 13, letterSpacing: 2, fontWeight: '700' },
  textoCarregandoSub: { marginTop: 4, color: CORES.textoSecundario, fontSize: 11, fontStyle: 'italic' },
  cabecalho: { marginBottom: 24 },
  saudacao: { color: CORES.textoPrincipal, fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  cicloLunar: { color: CORES.cianoNeon, fontSize: 11, marginTop: 6, letterSpacing: 2, fontFamily: 'monospace' },
  linhaDivisora: {
    height: 1,
    backgroundColor: CORES.bordaPainel,
    marginTop: 16,
    shadowColor: CORES.cianoNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  bannerCriticoGlobal: {
    backgroundColor: 'rgba(255, 45, 106, 0.12)',
    borderColor: CORES.vermelhoCritico,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: CORES.vermelhoCritico,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  textoBannerCritico: { color: CORES.vermelhoCritico, fontWeight: '800', fontSize: 13, letterSpacing: 2, textAlign: 'center' },
  textoBannerCriticoSub: { color: CORES.vermelhoCritico, fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginTop: 4, opacity: 0.7 },
  bannerErro: {
    backgroundColor: 'rgba(255, 122, 51, 0.12)',
    borderColor: CORES.laranjaAlerta,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  textoBannerErro: { color: CORES.laranjaAlerta, fontSize: 13, marginBottom: 10 },
  botaoRetry: { alignSelf: 'flex-start', backgroundColor: CORES.laranjaAlerta, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6 },
  textoBotaoRetry: { color: CORES.fundoEspaco, fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  botaoSimular: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderColor: CORES.cianoNeon,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: CORES.cianoNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  textoBotaoSimular: { color: CORES.cianoNeon, fontWeight: '700', fontSize: 13, letterSpacing: 3 },
  cartao: {
    backgroundColor: CORES.painelVidro,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: CORES.bordaPainel,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  cartaoCritico: {
    borderColor: CORES.vermelhoCritico,
    borderWidth: 1.5,
    shadowColor: CORES.vermelhoCritico,
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  linhaCabecalho: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconeRecurso: { fontSize: 18, marginRight: 8 },
  tituloCartao: { color: CORES.textoPrincipal, fontSize: 12, fontWeight: '800', letterSpacing: 2, flex: 1 },
  selo: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  textoSelo: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  linhaValor: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  valorPrincipal: { fontSize: 42, fontWeight: '300', fontFamily: 'monospace' },
  unidade: { fontSize: 18, fontWeight: '400' },
  detalhesDireita: { alignItems: 'flex-end' },
  detalheLabel: { color: CORES.textoSecundario, fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  detalheValor: { color: CORES.textoTecnico, fontSize: 14, fontFamily: 'monospace', marginTop: 2 },
  anelContainer: { marginVertical: 8 },
  anelTrilha: { height: 6, backgroundColor: 'rgba(120, 180, 255, 0.08)', borderRadius: 3, overflow: 'hidden' },
  anelPreenchido: { height: '100%', borderRadius: 3 },
  sensorLabel: { color: CORES.textoSecundario, fontSize: 11, marginTop: 8, fontFamily: 'monospace' },
  sensorPrefix: { color: CORES.cianoNeon, fontWeight: '700' },
  faixaAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 45, 106, 0.15)',
    borderTopWidth: 1,
    borderTopColor: CORES.vermelhoCritico,
    marginHorizontal: -18,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  iconeAlerta: { fontSize: 14, marginRight: 8, color: CORES.vermelhoCritico },
  textoAlerta: { color: CORES.vermelhoCritico, fontWeight: '600', fontSize: 12, flexShrink: 1, letterSpacing: 0.5 },
  seloSimulado: { marginTop: 10, fontSize: 10, color: CORES.roxoNebulosa, fontStyle: 'italic', letterSpacing: 1 },
  botaoCadastro: {
    backgroundColor: 'rgba(155, 89, 255, 0.15)',
    borderColor: CORES.roxoNebulosa,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: CORES.roxoNebulosa,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  textoBotaoCadastro: { color: CORES.roxoNebulosa, fontWeight: '700', fontSize: 13, letterSpacing: 3 },
  rodape: { color: CORES.textoSecundario, fontSize: 10, textAlign: 'center', marginTop: 30, letterSpacing: 2, fontFamily: 'monospace', opacity: 0.5 },
});
