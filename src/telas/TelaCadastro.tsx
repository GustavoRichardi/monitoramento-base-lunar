// src/telas/TelaCadastro.tsx
// Tela de cadastro com estilo sci-fi (Space Vibe).

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';

import { cadastrarRecurso } from '../servicos/recursoServico';
import {
  NovoRecurso,
  TipoRecurso,
  RecursoAgua,
  RecursoEnergia,
  RecursoClimatizacao,
} from '../tipos/recursos';
import { PropsTelaCadastro } from '../navegacao/AppNavegacao';

const CORES = {
  fundoEspaco: '#0B0D17',
  painelVidro: 'rgba(20, 25, 45, 0.6)',
  bordaPainel: 'rgba(120, 180, 255, 0.15)',
  cianoNeon: '#00E5FF',
  roxoNebulosa: '#9B59FF',
  laranjaAlerta: '#FF7A33',
  vermelhoCritico: '#FF2D6A',
  textoPrincipal: '#E6ECFF',
  textoSecundario: '#8A92B2',
  textoTecnico: '#5DD3FF',
};

const OPCOES_TIPO: { valor: TipoRecurso; rotulo: string; unidade: string; icone: string }[] = [
  { valor: TipoRecurso.AGUA, rotulo: 'ÁGUA', unidade: '%', icone: '💧' },
  { valor: TipoRecurso.ENERGIA, rotulo: 'ENERGIA', unidade: '%', icone: '⚡' },
  { valor: TipoRecurso.CLIMATIZACAO, rotulo: 'CLIMA', unidade: '°C', icone: '🌡' },
];

function paraNumero(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.');
  if (normalizado === '') return null;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

function montarNovoRecurso(
  tipo: TipoRecurso,
  nivelAtual: number,
  nivelCritico: number,
  localizacaoSensor: string,
  unidadeMedida: string,
): NovoRecurso {
  const base = { tipo, nivelAtual, nivelCritico, localizacaoSensor, unidadeMedida };

  switch (tipo) {
    case TipoRecurso.AGUA:
      return {
        ...base,
        tipo: TipoRecurso.AGUA,
        capacidadeReservatorioLitros: 0,
        percentualPotavel: 0,
        taxaReciclagemLitrosHora: 0,
      } as Omit<RecursoAgua, 'id' | 'status' | 'dataLeitura'>;
    case TipoRecurso.ENERGIA:
      return {
        ...base,
        tipo: TipoRecurso.ENERGIA,
        geracaoSolarKw: 0,
        consumoAtualKw: 0,
        capacidadeBateriaKwh: 0,
        emModoReserva: false,
      } as Omit<RecursoEnergia, 'id' | 'status' | 'dataLeitura'>;
    case TipoRecurso.CLIMATIZACAO:
      return {
        ...base,
        tipo: TipoRecurso.CLIMATIZACAO,
        temperaturaCelsius: nivelAtual,
        nivelOxigenio: 0,
        nivelCo2Ppm: 0,
        pressaoInternaKpa: 0,
      } as Omit<RecursoClimatizacao, 'id' | 'status' | 'dataLeitura'>;
  }
}

export function TelaCadastro({ navigation }: PropsTelaCadastro): React.JSX.Element {
  const [tipo, setTipo] = useState<TipoRecurso>(TipoRecurso.AGUA);
  const [nivelAtual, setNivelAtual] = useState<string>('');
  const [nivelCritico, setNivelCritico] = useState<string>('');
  const [localizacao, setLocalizacao] = useState<string>('');
  const [enviando, setEnviando] = useState<boolean>(false);

  const escalaEnviar = useRef(new Animated.Value(1)).current;

  const animarPulso = (valor: Animated.Value) => {
    Animated.sequence([
      Animated.timing(valor, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(valor, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const unidadeAtual = OPCOES_TIPO.find((o) => o.valor === tipo)?.unidade ?? '';

  const aoEnviar = useCallback(async () => {
    animarPulso(escalaEnviar);

    const nivelAtualNum = paraNumero(nivelAtual);
    const nivelCriticoNum = paraNumero(nivelCritico);

    if (localizacao.trim() === '') {
      Alert.alert('VALIDAÇÃO', 'Informe a localização do sensor.');
      return;
    }
    if (nivelAtualNum === null) {
      Alert.alert('VALIDAÇÃO', 'Nível atual inválido. Use apenas números.');
      return;
    }
    if (nivelCriticoNum === null) {
      Alert.alert('VALIDAÇÃO', 'Nível crítico inválido. Use apenas números.');
      return;
    }

    const novoRecurso = montarNovoRecurso(tipo, nivelAtualNum, nivelCriticoNum, localizacao.trim(), unidadeAtual);

    setEnviando(true);
    const resultado = await cadastrarRecurso(novoRecurso);
    setEnviando(false);

    if (resultado.sucesso) {
      Alert.alert('◉ CADASTRO CONFIRMADO', 'Recurso registrado no sistema central.', [
        { text: 'OK', onPress: () => navigation.navigate('Monitoramento') },
      ]);
    } else {
      Alert.alert('⚠ ERRO NO CADASTRO', resultado.erro.mensagem);
    }
  }, [tipo, nivelAtual, nivelCritico, localizacao, unidadeAtual, navigation]);

  return (
    <KeyboardAvoidingView style={estilos.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={estilos.container} contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={estilos.tituloPrincipal}>NOVO REGISTRO</Text>
        <Text style={estilos.subtitulo}>// adicionar sensor à malha de telemetria</Text>
        <View style={estilos.linhaDivisora} />

        <Text style={estilos.rotulo}>TIPO DO RECURSO</Text>
        <View style={estilos.grupoTipo}>
          {OPCOES_TIPO.map((opcao) => {
            const selecionado = opcao.valor === tipo;
            return (
              <TouchableOpacity
                key={opcao.valor}
                style={[estilos.botaoTipo, selecionado && estilos.botaoTipoSelecionado]}
                onPress={() => setTipo(opcao.valor)}
                activeOpacity={0.7}
              >
                <Text style={estilos.iconeTipo}>{opcao.icone}</Text>
                <Text style={[estilos.textoBotaoTipo, selecionado && estilos.textoBotaoTipoSelecionado]}>
                  {opcao.rotulo}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={estilos.rotulo}>NÍVEL ATUAL ({unidadeAtual})</Text>
        <TextInput
          style={estilos.input}
          value={nivelAtual}
          onChangeText={setNivelAtual}
          placeholder="0"
          placeholderTextColor={CORES.textoSecundario}
          keyboardType="numeric"
        />

        <Text style={estilos.rotulo}>LIMITE CRÍTICO ({unidadeAtual})</Text>
        <TextInput
          style={estilos.input}
          value={nivelCritico}
          onChangeText={setNivelCritico}
          placeholder="0"
          placeholderTextColor={CORES.textoSecundario}
          keyboardType="numeric"
        />

        <Text style={estilos.rotulo}>LOCALIZAÇÃO DO SENSOR</Text>
        <TextInput
          style={estilos.input}
          value={localizacao}
          onChangeText={setLocalizacao}
          placeholder="Ex: Módulo A · Setor 03"
          placeholderTextColor={CORES.textoSecundario}
        />

        <Animated.View style={{ transform: [{ scale: escalaEnviar }] }}>
          <TouchableOpacity
            style={[estilos.botaoEnviar, enviando && estilos.botaoDesabilitado]}
            onPress={aoEnviar}
            disabled={enviando}
            activeOpacity={0.8}
          >
            {enviando ? (
              <ActivityIndicator color={CORES.fundoEspaco} />
            ) : (
              <Text style={estilos.textoBotaoEnviar}>► CONFIRMAR CADASTRO</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={estilos.botaoCancelar} onPress={() => navigation.goBack()} disabled={enviando}>
          <Text style={estilos.textoBotaoCancelar}>« CANCELAR E VOLTAR</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: CORES.fundoEspaco },
  conteudo: { padding: 20, paddingBottom: 40 },
  tituloPrincipal: { color: CORES.textoPrincipal, fontSize: 22, fontWeight: '800', letterSpacing: 4 },
  subtitulo: { color: CORES.textoSecundario, fontSize: 11, fontStyle: 'italic', marginTop: 4, letterSpacing: 1 },
  linhaDivisora: { height: 1, backgroundColor: CORES.bordaPainel, marginVertical: 20 },
  rotulo: { color: CORES.cianoNeon, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginTop: 14, marginBottom: 8 },
  grupoTipo: { flexDirection: 'row', justifyContent: 'space-between' },
  botaoTipo: {
    flex: 1,
    paddingVertical: 14,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CORES.bordaPainel,
    backgroundColor: CORES.painelVidro,
    alignItems: 'center',
  },
  botaoTipoSelecionado: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderColor: CORES.cianoNeon,
    shadowColor: CORES.cianoNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  iconeTipo: { fontSize: 18, marginBottom: 4 },
  textoBotaoTipo: { fontSize: 11, fontWeight: '700', color: CORES.textoSecundario, letterSpacing: 1 },
  textoBotaoTipoSelecionado: { color: CORES.cianoNeon },
  input: {
    backgroundColor: CORES.painelVidro,
    borderWidth: 1,
    borderColor: CORES.bordaPainel,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: CORES.textoPrincipal,
    fontFamily: 'monospace',
  },
  botaoEnviar: {
    backgroundColor: CORES.cianoNeon,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    minHeight: 52,
    justifyContent: 'center',
    shadowColor: CORES.cianoNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  botaoDesabilitado: { opacity: 0.5 },
  textoBotaoEnviar: { color: CORES.fundoEspaco, fontWeight: '800', fontSize: 14, letterSpacing: 3 },
  botaoCancelar: { paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  textoBotaoCancelar: { color: CORES.textoSecundario, fontWeight: '600', fontSize: 12, letterSpacing: 2 },
});
