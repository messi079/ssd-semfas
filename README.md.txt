Controle de Substituição de SSD
Este é um aplicativo web simples para controlar a substituição de SSDs em até 160 unidades, com rastreamento de progresso e visualização em gráficos. Os dados são armazenados em tempo real usando o Google Firestore, permitindo que múltiplos usuários colaborem e vejam as atualizações instantaneamente.

Estrutura do Projeto
O projeto é composto pelos seguintes arquivos, organizados em uma estrutura de pastas:

ssd-tracker/
├── index.html
├── css/
│   └── style.css
└── js/
    └── script.js
└── README.md

index.html: A estrutura principal da página web, incluindo o formulário, a tabela de registros e as seções de gráficos.

css/style.css: Contém estilos CSS personalizados e overrides para complementar o Tailwind CSS.

js/script.js: Toda a lógica JavaScript para interagir com o DOM, gerenciar o estado da aplicação e se comunicar com o Firebase Firestore.

Funcionalidades
Acesso Direto: A aplicação é carregada imediatamente, sem a necessidade de login ou registro.

Registro de Substituições: Adicione, edite e exclua registros de substituição de SSD com detalhes como ID da unidade, capacidade, técnico responsável, data e status.

ID da Sessão: Cada ação é associada a um ID de sessão anônimo do Firebase, que pode ser útil para rastreamento básico.

Visualização de Progresso: Acompanhe o progresso geral das 160 unidades e a distribuição por status (Concluída, Pendente, Em Andamento, Cancelada) através de gráficos intuitivos.

Colaboração em Tempo Real: As alterações são sincronizadas instantaneamente entre todos os usuários conectados.

Interface Responsiva: O design se adapta a diferentes tamanhos de tela (desktop, tablet, mobile).

Como Configurar e Rodar (para desenvolvimento ou deploy)
Pré-requisitos
Uma conta Google.

Um projeto Firebase configurado.

1. Configurar o Firebase
Acesse o Console do Firebase.

Crie um novo projeto ou selecione um existente.

No seu projeto, vá em "Autenticação" > "Começar" e ative o método de login "Anônimo". (Isso é crucial para que as regras do Firestore funcionem, mesmo que o usuário não interaja diretamente com essa autenticação).

Vá em "Firestore Database" > "Criar banco de dados".

Escolha o modo "Iniciar no modo de produção" (você ajustará as regras de segurança a seguir).

Selecione a localização do seu Cloud Firestore.

Regras de Segurança do Firestore: No Firestore, vá na aba "Regras" e atualize-as para permitir leitura e escrita públicas para usuários autenticados (incluindo anônimos). Isso é crucial para que a aplicação possa ler e escrever dados. ATENÇÃO: Para uma aplicação em produção, estas regras devem ser mais restritivas e considerar a validação de dados!

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite leitura e escrita para qualquer usuário autenticado (incluindo anônimo)
    // Isso é necessário para que a aplicação possa ler e escrever dados,
    // já que ela faz um signInAnonymously em segundo plano.
    match /artifacts/{appId}/public/data/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}

Obter as Credenciais do Firebase:

No Console do Firebase, vá em "Configurações do projeto" (ícone de engrenagem) > "Configurações do projeto".

Role para baixo até a seção "Seus aplicativos". Se você não tiver um aplicativo web, clique em </> (Adicionar aplicativo web) e siga as instruções.

Copie o objeto firebaseConfig. Ele se parecerá com algo assim:

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};

Você precisará desses valores para o próximo passo.

2. Integrar as Credenciais no Código
No arquivo js/script.js, as credenciais do Firebase são injetadas através de variáveis globais (__firebase_config e __app_id) que são fornecidas pelo ambiente onde o código está sendo executado (como o Canvas do Gemini).

Para rodar este código localmente ou em outro ambiente, você precisará substituir essas variáveis pelas suas credenciais reais do Firebase.

No js/script.js:

Procure por esta linha:

const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
// ...
appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

E substitua-a pelas suas credenciais, assim:

const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_AUTH_DOMAIN_AQUI",
  projectId: "SEU_PROJECT_ID_AQUI",
  storageBucket: "SEU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID_AQUI",
  appId: "SEU_APP_ID_AQUI"
};
// Certifique-se de que o appId seja o mesmo do seu firebaseConfig
const appId = firebaseConfig.appId;

Importante: O __initial_auth_token é específico do ambiente do Gemini e não será necessário se você estiver rodando o projeto localmente ou em outro servidor. A autenticação anônima do Firebase será usada automaticamente.

3. Rodar a Aplicação
Crie uma pasta principal (ex: ssd-tracker).

Dentro dela, crie as subpastas css e js.

Coloque index.html na pasta ssd-tracker/.

Coloque style.css na pasta ssd-tracker/css/.

Coloque script.js na pasta ssd-tracker/js/.

Abra o arquivo index.html em seu navegador.

Ou, para um servidor local simples (recomendado para desenvolvimento):

Navegue até a pasta ssd-tracker/ no seu terminal.

Execute um servidor HTTP simples (se tiver Python instalado):

python -m http.server 8000

Ou com Node.js (se tiver http-server instalado globalmente):

npx http-server

Abra seu navegador e acesse http://localhost:8000 (ou a porta indicada pelo seu servidor).

Contribuição
Sinta-se à vontade para clonar este repositório, propor melhorias e contribuir!