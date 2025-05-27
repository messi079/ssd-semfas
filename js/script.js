// Importações do Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const TOTAL_UNITS = 160; // Número total de unidades para substituição de SSD
let ssdRecords = []; // Array para armazenar os registros de SSD
let editingRecordId = null; // ID do registro atualmente em edição

// Instâncias e variáveis do Firebase
let db, auth;
let sessionId = 'anon-session'; // ID da sessão do usuário (inicialmente um valor padrão)
let appId; // ID da aplicação fornecido pelo ambiente
let isFirebaseReady = false; // Flag para indicar se o Firebase está inicializado e autenticado

// Elementos do DOM (referências a elementos de autenticação removidas)
const appSection = document.getElementById('appSection'); // A seção principal da aplicação
const ssdForm = document.getElementById('ssdForm');
const ssdList = document.getElementById('ssdList');
const noRecordsMessage = document.getElementById('noRecordsMessage');

const tabControle = document.getElementById('tabControle');
const tabGraficos = document.getElementById('tabGraficos');
const sectionControle = document.getElementById('sectionControle');
const sectionGraficos = document.getElementById('sectionGraficos');

const progressBar = document.getElementById('progressBar');
const completedCountSpan = document.getElementById('completedCount');
const progressPercentageSpan = document.getElementById('progressPercentage');
const remainingCountSpan = document.getElementById('remainingCount');

const statusCompletedSpan = document.getElementById('statusCompleted');
const statusPendingSpan = document.getElementById('statusPending');
const statusInProgressSpan = document.getElementById('statusInProgress');
const statusCancelledSpan = document.getElementById('statusCancelled');

const barCompleted = document.getElementById('barCompleted');
const barPending = document.getElementById('barPending');
const barInProgress = document.getElementById('barInProgress');
const barCancelled = document.getElementById('barCancelled');

const messageModal = document.getElementById('messageModal');
const modalMessage = document.getElementById('modalMessage');
const modalButtonsContainer = document.getElementById('modalButtonsContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const userIdDisplay = document.getElementById('userIdDisplay'); // Exibe o ID da sessão

/**
 * Exibe um modal de mensagem personalizado com botões dinâmicos.
 * @param {string} message - A mensagem a ser exibida.
 * @param {Array<Object>} buttons - Array de objetos de botão { text, className, onClick }.
 */
function showMessage(message, buttons = [{ text: 'OK', className: 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors', onClick: () => messageModal.classList.add('hidden') }]) {
    modalMessage.textContent = message;
    modalButtonsContainer.innerHTML = ''; // Limpa botões existentes
    buttons.forEach(btnConfig => {
        const button = document.createElement('button');
        button.textContent = btnConfig.text;
        button.className = btnConfig.className;
        button.onclick = btnConfig.onClick;
        modalButtonsContainer.appendChild(button);
    });
    messageModal.classList.remove('hidden');
}

/**
 * Renderiza a lista de registros de SSD na tabela.
 */
function renderSsdList() {
    ssdList.innerHTML = ''; // Limpa a lista existente
    if (ssdRecords.length === 0) {
        noRecordsMessage.classList.remove('hidden');
        return;
    } else {
        noRecordsMessage.classList.add('hidden');
    }

    // Ordena os registros pela data de criação (mais novos primeiro)
    const sortedRecords = [...ssdRecords].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });

    sortedRecords.forEach(record => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors duration-200';
        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${record.unidadeId}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${record.modeloUnidade || 'N/A'}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${record.capacidadeHdd}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${record.capacidadeSsd}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${record.marcaModeloSsd}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${record.numeroSerieSsd}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${record.dataSubstituicao}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${record.tecnicoResponsavel}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold ${getStatusColorClass(record.statusSubstituicao)}">${record.statusSubstituicao}</td>
            <td class="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title="${record.observacoes}">${record.observacoes || 'N/A'}</td>
            <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                <button data-id="${record.id}" class="edit-btn text-blue-600 hover:text-blue-900 mr-3 transition-colors duration-200">Editar</button>
                <button data-id="${record.id}" class="delete-btn text-red-600 hover:text-red-900 transition-colors duration-200">Excluir</button>
            </td>
        `;
        ssdList.appendChild(row);
    });

    addEventListenersToButtons();
}

/**
 * Retorna a classe CSS do Tailwind para a cor do status.
 * @param {string} status - A string do status.
 * @returns {string} - Classe CSS do Tailwind.
 */
function getStatusColorClass(status) {
    switch (status) {
        case 'Concluída': return 'text-green-600';
        case 'Pendente': return 'text-yellow-600';
        case 'Em Andamento': return 'text-blue-600';
        case 'Cancelada': return 'text-red-600';
        default: return 'text-gray-700';
    }
}

/**
 * Adiciona listeners de evento aos botões de edição e exclusão.
 */
function addEventListenersToButtons() {
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.onclick = (event) => editRecord(event.target.dataset.id);
    });
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (event) => deleteRecord(event.target.dataset.id);
    });
}

/**
 * Preenche o formulário com dados para edição de um registro.
 * @param {string} id - O ID do registro a ser editado.
 */
function editRecord(id) {
    const recordToEdit = ssdRecords.find(record => record.id === id);
    if (recordToEdit) {
        document.getElementById('unidadeId').value = recordToEdit.unidadeId;
        document.getElementById('modeloUnidade').value = recordToEdit.modeloUnidade;
        document.getElementById('capacidadeHdd').value = recordToEdit.capacidadeHdd;
        document.getElementById('capacidadeSsd').value = recordToEdit.capacidadeSsd;
        document.getElementById('marcaModeloSsd').value = recordToEdit.marcaModeloSsd;
        document.getElementById('numeroSerieSsd').value = recordToEdit.numeroSerieSsd;
        document.getElementById('dataSubstituicao').value = recordToEdit.dataSubstituicao;
        document.getElementById('tecnicoResponsavel').value = recordToEdit.tecnicoResponsavel;
        document.getElementById('statusSubstituicao').value = recordToEdit.statusSubstituicao;
        document.getElementById('observacoes').value = recordToEdit.observacoes;

        editingRecordId = id; // Define o ID do registro que está sendo editado
        ssdForm.querySelector('button[type="submit"]').textContent = 'Atualizar Substituição';
        showMessage('Modo de Edição: Atualize os campos e clique em "Atualizar Substituição".');
        // Rola a tela para o topo do formulário
        ssdForm.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Exclui um registro do array e atualiza o Firestore.
 * @param {string} id - O ID do registro a ser excluído.
 */
function deleteRecord(id) {
    showMessage(
        'Tem certeza que deseja excluir este registro?',
        [
            {
                text: 'Excluir',
                className: 'px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors',
                onClick: async () => {
                    try {
                        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'ssdReplacements', id);
                        await deleteDoc(docRef);
                        showMessage('Registro excluído com sucesso!');
                    } catch (e) {
                        showMessage(`Erro ao excluir registro: ${e.message}`);
                    }
                    messageModal.classList.add('hidden'); // Oculta o modal de confirmação
                }
            },
            {
                text: 'Cancelar',
                className: 'px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors',
                onClick: () => messageModal.classList.add('hidden')
            }
        ]
    );
}

/**
 * Lida com o envio do formulário para adicionar ou atualizar registros no Firestore.
 * @param {Event} event - O evento de envio do formulário.
 */
ssdForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!isFirebaseReady) {
        showMessage('Aguarde, a aplicação ainda está carregando ou houve um problema de inicialização.');
        return;
    }

    const recordData = {
        unidadeId: document.getElementById('unidadeId').value,
        modeloUnidade: document.getElementById('modeloUnidade').value,
        capacidadeHdd: document.getElementById('capacidadeHdd').value,
        capacidadeSsd: document.getElementById('capacidadeSsd').value,
        marcaModeloSsd: document.getElementById('marcaModeloSsd').value,
        numeroSerieSsd: document.getElementById('numeroSerieSsd').value,
        dataSubstituicao: document.getElementById('dataSubstituicao').value,
        tecnicoResponsavel: document.getElementById('tecnicoResponsavel').value,
        statusSubstituicao: document.getElementById('statusSubstituicao').value,
        observacoes: document.getElementById('observacoes').value,
        updatedAt: new Date().toISOString(), // Sempre atualiza 'updatedAt'
        createdBy: sessionId, // Usa o ID da sessão como identificador
        updatedBy: sessionId, // Usa o ID da sessão como identificador
    };

    try {
        if (editingRecordId) {
            // Atualiza um registro existente
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'ssdReplacements', editingRecordId);
            await updateDoc(docRef, recordData);
            showMessage('Registro atualizado com sucesso!');
        } else {
            // Adiciona um novo registro
            recordData.createdAt = new Date().toISOString(); // Define 'createdAt' apenas para novos registros
            const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'ssdReplacements'), recordData);
            showMessage('Substituição adicionada com sucesso!');
        }
        editingRecordId = null; // Reinicia o modo de edição
        ssdForm.querySelector('button[type="submit"]').textContent = 'Adicionar Substituição';
        ssdForm.reset(); // Limpa o formulário
    } catch (e) {
        console.error("Erro ao salvar registro no Firestore:", e);
        showMessage(`Erro ao salvar registro: ${e.message}`);
    }
});

/**
 * Atualiza os dados do gráfico e a barra de progresso com base nos registros atuais.
 */
function updateCharts() {
    const completed = ssdRecords.filter(record => record.statusSubstituicao === 'Concluída').length;
    const pending = ssdRecords.filter(record => record.statusSubstituicao === 'Pendente').length;
    const inProgress = ssdRecords.filter(record => record.statusSubstituicao === 'Em Andamento').length;
    const cancelled = ssdRecords.filter(record => record.statusSubstituicao === 'Cancelada').length;

    const progress = (completed / TOTAL_UNITS) * 100;
    const remaining = TOTAL_UNITS - completed;

    // Atualiza o progresso geral
    progressBar.style.width = `${progress}%`;
    completedCountSpan.textContent = completed;
    progressPercentageSpan.textContent = `${progress.toFixed(1)}%`;
    remainingCountSpan.textContent = remaining;

    // Atualiza a distribuição de status
    statusCompletedSpan.textContent = completed;
    statusPendingSpan.textContent = pending;
    statusInProgressSpan.textContent = inProgress;
    statusCancelledSpan.textContent = cancelled;

    // Atualiza o gráfico de barras (simulado)
    const maxCount = Math.max(completed, pending, inProgress, cancelled, 1); // Garante que a divisão por zero seja evitada
    barCompleted.style.width = `${(completed / maxCount) * 100}%`;
    barCompleted.textContent = completed > 0 ? completed : '';
    barPending.style.width = `${(pending / maxCount) * 100}%`;
    barPending.textContent = pending > 0 ? pending : '';
    barInProgress.style.width = `${(inProgress / maxCount) * 100}%`;
    barInProgress.textContent = inProgress > 0 ? inProgress : '';
    barCancelled.style.width = `${(cancelled / maxCount) * 100}%`;
    barCancelled.textContent = cancelled > 0 ? cancelled : '';
}

/**
 * Lida com a troca de abas.
 * @param {string} activeTab - O ID da aba a ser ativada ('controle' ou 'graficos').
 */
function switchTab(activeTab) {
    if (activeTab === 'controle') {
        sectionControle.classList.remove('hidden');
        sectionGraficos.classList.add('hidden');
        tabControle.classList.add('bg-blue-600', 'text-white');
        tabControle.classList.remove('bg-gray-200', 'text-gray-800');
        tabGraficos.classList.remove('bg-blue-600', 'text-white');
        tabGraficos.classList.add('bg-gray-200', 'text-gray-800');
    } else if (activeTab === 'graficos') {
        sectionGraficos.classList.remove('hidden');
        sectionControle.classList.add('hidden');
        tabGraficos.classList.add('bg-blue-600', 'text-white');
        tabGraficos.classList.remove('bg-gray-200', 'text-gray-800');
        tabControle.classList.remove('bg-blue-600', 'text-white');
        tabControle.classList.add('bg-gray-200', 'text-gray-800');
        updateCharts(); // Garante que os gráficos sejam atualizados ao visualizar a aba
    }
}

/**
 * Inicia o listener em tempo real do Firestore para registros de SSD.
 */
function startFirestoreListener() {
    if (!isFirebaseReady || !db) {
        console.warn("Firebase não está pronto para iniciar o listener do Firestore.");
        return;
    }

    const q = collection(db, 'artifacts', appId, 'public', 'data', 'ssdReplacements');
    onSnapshot(q, (snapshot) => {
        const records = [];
        snapshot.forEach(doc => {
            records.push({ id: doc.id, ...doc.data() });
        });
        ssdRecords = records; // Atualiza o array local
        renderSsdList(); // Renderiza novamente a tabela
        updateCharts(); // Renderiza novamente os gráficos
    }, (error) => {
        console.error("Erro ao carregar dados do Firestore:", error);
        showMessage(`Erro ao carregar dados: ${error.message}`);
    });
}

// Carregamento inicial e configuração do Firebase
window.onload = async () => {
    loadingOverlay.classList.remove('hidden'); // Exibe o overlay de carregamento

    try {
        // Suas credenciais do Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyClraEHA4HUsFV59IiDxgcvkvBmr867xv8",
            authDomain: "ssd-semfas-2025.firebaseapp.com",
            projectId: "ssd-semfas-2025",
            storageBucket: "ssd-semfas-2025.firebasestorage.app",
            messagingSenderId: "174796272986",
            appId: "1:174796272986:web:20a609a7077df8501e6f63",
            measurementId: "G-TRCK4DQGKL"
        };
        appId = firebaseConfig.appId; // Define appId a partir da sua configuração

        // Inicializa o Firebase
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Autentica anonimamente no Firebase para satisfazer as regras de segurança do Firestore
        // Isso é feito uma única vez no início, e é transparente para o usuário.
        try {
            const userCredential = await signInAnonymously(auth);
            sessionId = userCredential.user.uid;
            userIdDisplay.textContent = `ID da Sessão: ${sessionId}`;
            isFirebaseReady = true; // Marca o Firebase como pronto
            loadingOverlay.classList.add('hidden'); // Oculta o overlay de carregamento

            // Inicia a escuta dos dados do Firestore e exibe a UI principal
            startFirestoreListener();
            switchTab('controle'); // Padrão para a aba de controle
        } catch (authError) {
            console.error("Erro na autenticação anônima do Firebase:", authError);
            showMessage(`Erro ao iniciar sessão: ${authError.message}. A aplicação pode não funcionar corretamente. Verifique as regras do Firebase.`);
            sessionId = 'anon-fallback-' + crypto.randomUUID(); // Fallback para ID de sessão local
            userIdDisplay.textContent = `ID da Sessão (Erro): ${sessionId}`;
            isFirebaseReady = true; // Marca como pronto para exibir a UI, mesmo com erro de auth
            loadingOverlay.classList.add('hidden');
            // Tenta iniciar o listener mesmo com erro de auth, pode falhar por permissões
            startFirestoreListener();
            switchTab('controle');
        }

    } catch (initError) {
        console.error("Erro fatal na inicialização do Firebase:", initError);
        showMessage(`Erro fatal ao carregar a aplicação: ${initError.message}. Por favor, tente novamente.`);
        loadingOverlay.classList.add('hidden'); // Certifica-se de que o overlay seja ocultado mesmo em caso de erro fatal
    }
};

// Listeners de evento para os botões das abas
tabControle.addEventListener('click', () => switchTab('controle'));
tabGraficos.addEventListener('click', () => switchTab('graficos'));
