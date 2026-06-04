#  Monitoramento de Recursos da Base Lunar

Aplicativo mobile para **monitoramento em tempo real dos recursos críticos de uma base lunar** — água, energia e climatização. Desenvolvido em **React Native** com **TypeScript**, consumindo uma **API REST em Spring Boot** para leitura e cadastro dos sensores da base.

O app foi projetado com foco em **resiliência operacional**: a interface nunca trava ao aguardar dados de rede e o aplicativo não fecha sozinho (crash) caso o backend esteja indisponível. Alertas visuais claros destacam imediatamente qualquer recurso em estado crítico.

> Projeto desenvolvido para a **Global Solution — FIAP** (Advanced Programming and Mobile Development).

---

##  Funcionalidades implementadas

###  Monitoramento
- Tela inicial que carrega o status dos recursos automaticamente ao abrir (via `useEffect`).
- Cartões visuais individuais para **Água**, **Energia** e **Climatização**, exibindo nível atual, limite crítico, sensor de origem e status operacional.
- Atualização por *pull-to-refresh*.

###  Alertas operacionais
- Verificação de criticidade **direcional** — água e energia alertam quando ficam *abaixo* do limite; climatização alerta quando fica *acima* dele.
- Sinalização visual em três camadas: banner global no topo da tela, faixa vermelha com ícone de aviso dentro do card e borda destacada no recurso crítico.
- Fonte de verdade primária no campo `status` calculado pelo serviço, com reforço por valor bruto.

### 📝 Cadastro
- Formulário controlado (um `useState` por campo) para cadastrar novos recursos/sensores.
- Seleção de tipo do recurso, nível atual, nível crítico e localização do sensor.
- Validação de entrada (campos obrigatórios e conversão numérica segura, com suporte a vírgula decimal pt-BR).
- Envio via **POST** e retorno automático à tela de monitoramento após sucesso.

###  Resiliência e tratamento de erros
- Cliente HTTP centralizado com **timeout obrigatório** (via `AbortController`) e **normalização de erros** em um contrato tipado e único.
- Padrão `ResultadoApi<T>`: toda falha vira **valor de retorno**, nunca exceção que derruba o app.
- **Mock de teste opcional** (controlado por flag) que retorna dados fictícios com recursos em estado crítico quando o backend está offline, permitindo testar os alertas visuais sem o Spring Boot rodando.

---

##  Arquitetura

Estrutura organizada em camadas, com separação clara de responsabilidades:

```
src/
├── tipos/
│   └── recursos.ts          # Tipagem dos recursos (união discriminada)
├── servicos/
│   ├── api.ts               # Cliente HTTP central: timeout, erro tipado
│   └── recursoServico.ts    # Funções GET/POST + mock de teste
├── navegacao/
│   └── AppNavegacao.tsx      # Stack Navigation tipado
└── telas/
    ├── TelaMonitoramento.tsx # Tela inicial com cards e alertas
    └── TelaCadastro.tsx      # Formulário de cadastro (POST)
```

**Decisões de design relevantes:**
- **União discriminada** no campo `tipo` dos recursos, garantindo *type narrowing* automático e segurança de tipos.
- **Camada de serviço isolada**: as telas nunca falam diretamente com o cliente HTTP; consomem apenas funções de serviço tipadas.
- **Erro como valor, não exceção**, o que cumpre o requisito de o app não fechar sozinho diante de falhas de rede.

---

##  Tecnologias utilizadas

| Categoria | Tecnologia |
|-----------|-----------|
| Framework mobile | React Native (Expo) |
| Linguagem | TypeScript |
| Navegação | React Navigation (Native Stack) |
| Requisições HTTP | Fetch API + AbortController |
| Backend (consumido) | API REST em Spring Boot (Java) |
| Estilização | StyleSheet nativo do React Native |

---

##  Como rodar o projeto localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão LTS recomendada)
- App **Expo Go** no celular **ou** um emulador Android/iOS configurado
- Backend Spring Boot em execução (opcional — veja a nota sobre o mock abaixo)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/SEU-USUARIO/monitoramento-base-lunar.git
cd monitoramento-base-lunar

# 2. Instale as dependências do projeto
npm install

# 3. Instale as dependências de navegação (caso necessário)
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context

# 4. Inicie o projeto
npx expo start
```

Em seguida, escaneie o QR Code com o app **Expo Go** ou pressione `a` (Android) / `i` (iOS) para abrir em um emulador.

###  Configuração da API

A URL base do backend é configurável via variável de ambiente em `src/servicos/api.ts`:

```
EXPO_PUBLIC_API_URL=http://localhost:8080/api
```

> **Nota sobre o emulador:** no emulador Android, `localhost` aponta para o próprio dispositivo virtual. Use `http://10.0.2.2:8080/api` para acessar o backend rodando na sua máquina.

###  Modo de teste sem backend

O arquivo `src/servicos/recursoServico.ts` possui a flag `USAR_MOCK_EM_FALHA`:
- **`true`** (padrão de desenvolvimento): se a API estiver indisponível, o app exibe dados fictícios com recursos em estado crítico, ideal para testar os alertas no emulador.
- **`false`** (recomendado para produção/avaliação): falhas de rede exibem o estado de erro real na interface.

---

##  Integrantes

| Nome Completo | RM |
|---------------|-----|
| [Gustavo Henrique Richardi] | RM: [563874] |
| [Gustavo Pereira]           | RM: [563280] |
| [Nicolas Antonio Alves]     | RM: [561692] |


---

##  Licença

Projeto acadêmico desenvolvido para fins educacionais — FIAP Global Solution.
