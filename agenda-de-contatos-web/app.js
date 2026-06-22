/**
 * Agenda de Contatos - JavaScript Vanilla Core
 * 
 * Este arquivo gerencia todo o CRUD, renderização de cards e tabela,
 * buscas, filtros, gerenciamento de estados, estatísticas e integração com Supabase/LocalStorage.
 */

import { getSupabase, isSupabaseConfigured } from './supabase.js';

// --- ESTADO GLOBAL DA APLICAÇÃO ---
let contacts = [];
let activeCategory = "Todos";
let activeFavoriteOnly = false;
let searchQuery = "";
let layoutMode = localStorage.getItem("agenda_layout_mode") || "grid"; // 'grid' ou 'list'

// Controle de confirmação de exclusão sem usar 'window.confirm' (evita traves em iFrames)
let deleteConfirmTimeout = null;
let activeDeleteId = null;

// --- DADOS DE EXEMPLO (PARA CARREGAMENTO SEED INICIAL) ---
const SAMPLE_CONTACTS = [
  {
    id: "sample-1",
    nome: "Gustavo Silva Modesto",
    telefone: "(11) 98765-4321",
    email: "gustavo.modesto@exemplo.com",
    categoria: "Trabalho",
    observacao: "Desenvolvedor de Software Full Stack. Contato principal para projetos internos.",
    favorito: true,
    created_at: new Date().toISOString()
  },
  {
    id: "sample-2",
    nome: "Beatriz Oliveira Modesto",
    telefone: "(21) 99988-7766",
    email: "beatriz.oliver@familia.com",
    categoria: "Família",
    observacao: "Minha irmã preferida. Aniversário em 24 de Outubro. Sempre ligar à noite.",
    favorito: true,
    created_at: new Date().toISOString()
  },
  {
    id: "sample-3",
    nome: "Dr. Carlos André Costa",
    telefone: "(31) 91234-5678",
    email: "carlos.andre@clinica.com.br",
    categoria: "Trabalho",
    observacao: "médico cardiologista. Consultório na Av. Paulista, sala 412.",
    favorito: false,
    created_at: new Date().toISOString()
  },
  {
    id: "sample-4",
    nome: "Kiko (Carlos Eduardo)",
    telefone: "(19) 98122-3344",
    email: "kiko.eduardo@amigos.net",
    categoria: "Amigos",
    observacao: "Parceiro do futebol de quarta-feira. Organiza os churrascos do grupo.",
    favorito: false,
    created_at: new Date().toISOString()
  }
];

// --- CACHE DE ELEMENTOS DO DOM ---
const elements = {
  // Status de Conexão
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  modalConnectionStatusBadge: document.getElementById("modalConnectionStatusBadge"),
  
  // Filtros e Busca
  searchInput: document.getElementById("searchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  categoryFilters: document.getElementById("categoryFilters"),
  filterFavoritesBtn: document.getElementById("filterFavoritesBtn"),
  
  // Toggles de Layout
  layoutToggle: document.getElementById("layoutToggle"),
  gridToggle: document.getElementById("gridToggle"),
  listToggle: document.getElementById("listToggle"),
  
  // Estatísticas
  statTotal: document.getElementById("statTotal"),
  statFavorites: document.getElementById("statFavorites"),
  statTrabalho: document.getElementById("statTrabalho"),
  statFamilia: document.getElementById("statFamilia"),
  
  // Áreas de Listagem
  contactsSpinner: document.getElementById("contactsSpinner"),
  contactsGrid: document.getElementById("contactsGrid"),
  contactsListContainer: document.getElementById("contactsListContainer"),
  contactsListBody: document.getElementById("contactsListBody"),
  emptyState: document.getElementById("emptyState"),
  emptyStateMessage: document.getElementById("emptyStateMessage"),
  
  // Modais de Ação
  contactFormModalElement: document.getElementById("contactFormModal"),
  contactDetailsModalElement: document.getElementById("contactDetailsModal"),
  contactForm: document.getElementById("contactForm"),
  contactIdInput: document.getElementById("contactIdInput"),
  contactName: document.getElementById("contactName"),
  contactPhone: document.getElementById("contactPhone"),
  contactEmail: document.getElementById("contactEmail"),
  contactCategory: document.getElementById("contactCategory"),
  contactFavorite: document.getElementById("contactFavorite"),
  contactNotes: document.getElementById("contactNotes"),
  saveContactBtn: document.getElementById("saveContactBtn"),
  contactFormModalLabel: document.getElementById("contactFormModalLabel"),
  
  // Modal de Detalhes Interno
  detailFavoriteStar: document.getElementById("detailFavoriteStar"),
  detailAvatar: document.getElementById("detailAvatar"),
  detailName: document.getElementById("detailName"),
  detailCategory: document.getElementById("detailCategory"),
  detailPhone: document.getElementById("detailPhone"),
  detailCallLink: document.getElementById("detailCallLink"),
  detailEmailContainer: document.getElementById("detailEmailContainer"),
  detailEmail: document.getElementById("detailEmail"),
  detailEmailLink: document.getElementById("detailEmailLink"),
  detailNotesContainer: document.getElementById("detailNotesContainer"),
  detailNotes: document.getElementById("detailNotes"),
  detailDeleteBtn: document.getElementById("detailDeleteBtn"),
  detailEditBtn: document.getElementById("detailEditBtn"),
  
  // Botões e Ações Auxiliares
  loadSamplesBtn: document.getElementById("loadSamplesBtn"),
  copySqlBtn: document.getElementById("copySqlBtn"),
  toastContainer: document.getElementById("toastContainer")
};

// Bootstrap Modais virtuais de controle
let bootstrapFormModalInstance = null;
let bootstrapDetailsModalInstance = null;

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener("DOMContentLoaded", async () => {
  // Cria instâncias do Bootstrap Modal para controle via JS
  bootstrapFormModalInstance = new bootstrap.Modal(elements.contactFormModalElement);
  bootstrapDetailsModalInstance = new bootstrap.Modal(elements.contactDetailsModalElement);

  // Registra todos os manipuladores de evento
  setupEventListeners();
  
  // Detecta e atualiza o estado visual de conexão
  updateConnectionUI();

  // Carrega os dados (do Supabase ou LocalStorage)
  await loadAndRenderContacts();
  
  // Configura layout padrão persistido
  updateLayoutUI();
});

// --- SISTEMA DE EVENTOS ---
function setupEventListeners() {
  // Mudança do Layout Grid vs List
  elements.gridToggle.addEventListener("click", () => changeLayout("grid"));
  elements.listToggle.addEventListener("click", () => changeLayout("list"));
  
  // Filtro de Busca Realtime
  elements.searchInput.addEventListener("input", handleSearch);
  elements.clearSearchBtn.addEventListener("click", clearSearch);
  
  // Filtros de Categorias (Event Delegation nos links de categorias)
  elements.categoryFilters.addEventListener("click", (e) => {
    e.preventDefault();
    const link = e.target.closest("a");
    if (!link) return;
    
    // Altera active visual
    elements.categoryFilters.querySelectorAll(".nav-link").forEach(el => el.classList.remove("active"));
    link.classList.add("active");
    
    // Altera filtro do estado
    activeCategory = link.getAttribute("data-category");
    renderContacts();
  });
  
  // Filtro de Favoritos
  elements.filterFavoritesBtn.addEventListener("click", () => {
    activeFavoriteOnly = !activeFavoriteOnly;
    if (activeFavoriteOnly) {
      elements.filterFavoritesBtn.classList.remove("btn-outline-warning");
      elements.filterFavoritesBtn.classList.add("btn-warning", "text-dark");
      elements.filterFavoritesBtn.querySelector("i").className = "bi bi-star-fill";
    } else {
      elements.filterFavoritesBtn.classList.remove("btn-warning", "text-dark");
      elements.filterFavoritesBtn.classList.add("btn-outline-warning");
      elements.filterFavoritesBtn.querySelector("i").className = "bi bi-star";
    }
    renderContacts();
  });
  
  // Submissão do Formulário de Contato (Novo ou Edição)
  elements.contactForm.addEventListener("submit", handleFormSubmit);
  
  // Limpar os campos do formulário ao abrir para cadastrar novo
  document.getElementById("openAddModalBtn").addEventListener("click", () => prepareFormForInsert());
  if (document.getElementById("addFirstContactBtn")) {
    document.getElementById("addFirstContactBtn").addEventListener("click", () => prepareFormForInsert());
  }
  
  // Botão de Carregar Exemplos Rápidos caso esteja vazio
  elements.loadSamplesBtn.addEventListener("click", handleLoadSampleContacts);
  
  // Botão no modal de instruções: Copiar SQL
  elements.copySqlBtn.addEventListener("click", copySqlToClipboard);
  
  // Botões de Ação no modal de Detalhes
  elements.detailDeleteBtn.addEventListener("click", handleDetailDelete);
  elements.detailEditBtn.addEventListener("click", handleDetailEdit);
  elements.detailFavoriteStar.addEventListener("click", toggleDetailFavoriteInline);
}

// --- CONTROLE DE CONEXÃO E STATS VISUAIS ---
function updateConnectionUI() {
  const isConnected = isSupabaseConfigured();
  
  if (isConnected) {
    elements.statusDot.className = "status-dot bg-success";
    elements.statusText.textContent = "Supabase Conectado";
    elements.modalConnectionStatusBadge.className = "badge bg-success";
    elements.modalConnectionStatusBadge.textContent = "Supabase Cloud Conectado";
    document.getElementById("spinnerText").textContent = "Sincronizando com a nuvem do Supabase...";
  } else {
    elements.statusDot.className = "status-dot bg-warning";
    elements.statusText.textContent = "Persistência em Cache Local";
    elements.modalConnectionStatusBadge.className = "badge bg-warning text-dark";
    elements.modalConnectionStatusBadge.textContent = "Modo Local Storage";
    document.getElementById("spinnerText").textContent = "Recuperando contatos salvos localmente...";
  }
}

// --- SERVIÇÃO DE DADOS (READ, CREATE, UPDATE, DELETE) ---

// Realiza o carregamento dos contatos
async function loadAndRenderContacts() {
  elements.contactsSpinner.classList.remove("d-none");
  elements.contactsGrid.classList.add("d-none");
  elements.contactsListContainer.classList.add("d-none");
  elements.emptyState.classList.add("d-none");
  
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('contatos')
        .select('*')
        .order('nome', { ascending: true });
        
      if (error) throw error;
      contacts = data || [];
    } else {
      // Carrega do LocalStorage
      const stored = localStorage.getItem("agenda_contatos");
      if (stored) {
        contacts = JSON.parse(stored);
        // Ordena por nome alfabeticamente
        contacts.sort((a, b) => a.nome.localeCompare(b.nome));
      } else {
        contacts = [];
      }
    }
  } catch (error) {
    console.error("Erro ao carregar contatos:", error);
    showToast("Erro de Sincronização", "Não foi possível buscar os dados da nuvem. Detalhes: " + error.message, "danger");
    
    // Fallback de contingência para local storage caso dê erro com o Supabase
    const stored = localStorage.getItem("agenda_contatos") || "[]";
    contacts = JSON.parse(stored);
  } finally {
    elements.contactsSpinner.classList.add("d-none");
    renderContacts();
  }
}

// Salva o contato (CREATE ou UPDATE)
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = elements.contactIdInput.value;
  const nome = elements.contactName.value.trim();
  const telefone = elements.contactPhone.value.trim();
  const email = elements.contactEmail.value.trim() || null;
  const categoria = elements.contactCategory.value;
  const favorito = elements.contactFavorite.checked;
  const observacao = elements.contactNotes.value.trim() || null;
  
  if (!nome || !telefone) {
    showToast("Validação", "Os campos Nome Completo e Telefone são obrigatórios.", "warning");
    return;
  }
  
  const isEditing = id && id.trim() !== "";
  elements.saveContactBtn.disabled = true;
  elements.saveContactBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...`;
  
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      if (isEditing) {
        // Fluxo de Atualização no Supabase
        const { error } = await supabase
          .from('contatos')
          .update({ nome, telefone, email, categoria, favorito, observacao })
          .eq('id', id);
          
        if (error) throw error;
        showToast("Sucesso!", `Contato "${nome}" atualizado na nuvem.`, "success");
      } else {
        // Fluxo de Inserção no Supabase
        const { error } = await supabase
          .from('contatos')
          .insert([{ nome, telefone, email, categoria, favorito, observacao }]);
          
        if (error) throw error;
        showToast("Sucesso!", `Contato "${nome}" adicionado com sucesso.`, "success");
      }
    } else {
      // Fluxo LocalStorage
      if (isEditing) {
        const index = contacts.findIndex(c => c.id === id);
        if (index !== -1) {
          contacts[index] = { ...contacts[index], nome, telefone, email, categoria, favorito, observacao };
        }
        showToast("Sucesso!", `Contato "${nome}" atualizado localmente.`, "success");
      } else {
        const newContact = {
          id: 'local-' + Date.now().toString(36),
          nome,
          telefone,
          email,
          categoria,
          favorito,
          observacao,
          created_at: new Date().toISOString()
        };
        contacts.push(newContact);
        showToast("Sucesso!", `Contato "${nome}" adicionado ao cache local.`, "success");
      }
      
      saveContactsToLocalStorage();
    }
    
    bootstrapFormModalInstance.hide();
    await loadAndRenderContacts();
  } catch (error) {
    console.error("Erro ao salvar contato:", error);
    showToast("Erro ao Gravar", "Houve um problema ao salvar as modificações: " + error.message, "danger");
  } finally {
    elements.saveContactBtn.disabled = false;
    elements.saveContactBtn.innerHTML = `<i class="bi bi-check-lg"></i> Salvar Contato`;
  }
}

// Apaga um contato pelo ID
async function performDeleteContact(id, nome) {
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('contatos')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      showToast("Contato Excluído", `"${nome}" foi removido com sucesso de sua conta em nuvem.`, "success");
    } else {
      contacts = contacts.filter(c => c.id !== id);
      saveContactsToLocalStorage();
      showToast("Contato Excluído", `"${nome}" foi removido do cache local.`, "success");
    }
    
    // Fecha o modal de detalhes caso esteja aberto
    bootstrapDetailsModalInstance.hide();
    await loadAndRenderContacts();
  } catch (error) {
    console.error("Erro ao excluir contato:", error);
    showToast("Erro ao Excluir", "Não foi possível remover este contato: " + error.message, "danger");
  }
}

// Atualização inline de favorito (Clique na estrela do card ou tabela diretamente)
async function toggleContactFavorite(id, currentStatus) {
  try {
    const nextStatus = !currentStatus;
    
    // Otimista: Atualiza no array local primeiro para maior fluidez na resposta visual
    const localIndex = contacts.findIndex(c => c.id === id);
    if (localIndex !== -1) {
      contacts[localIndex].favorito = nextStatus;
      renderContacts();
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('contatos')
        .update({ favorito: nextStatus })
        .eq('id', id);
        
      if (error) {
        // Se der erro no Supabase, desfaz alt. otimista
        if (localIndex !== -1) {
          contacts[localIndex].favorito = currentStatus;
          renderContacts();
        }
        throw error;
      }
    } else {
      saveContactsToLocalStorage();
    }
  } catch (error) {
    console.error("Erro ao favoritar contato:", error);
    showToast("Erro operacional", "Não foi possível atualizar o favorito: " + error.message, "danger");
  }
}

// Salva lista local para LocalStorage
function saveContactsToLocalStorage() {
  localStorage.setItem("agenda_contatos", JSON.stringify(contacts));
}

// --- CARREGADORES DE FORMULÁRIO ---
function prepareFormForInsert() {
  elements.contactFormModalLabel.innerHTML = `<i class="bi bi-person-plus-fill text-primary me-2"></i>Novo Contato`;
  elements.contactIdInput.value = "";
  elements.contactName.value = "";
  elements.contactPhone.value = "";
  elements.contactEmail.value = "";
  elements.contactCategory.value = "Família";
  elements.contactFavorite.checked = false;
  elements.contactNotes.value = "";
}

// --- RENDERIZADORES DE INTERFACE ---
function renderContacts() {
  // Filtra de acordo com os filtros de Cabeçalho do Usuário
  const filtered = contacts.filter(contact => {
    // 1. Filtro de Categoria
    if (activeCategory !== "Todos" && contact.categoria !== activeCategory) {
      return false;
    }
    
    // 2. Filtro de Favorito Único
    if (activeFavoriteOnly && !contact.favorito) {
      return false;
    }
    
    // 3. Filtro de Query de Busca
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchNome = contact.nome?.toLowerCase().includes(q);
      const matchTelefone = contact.telefone?.toLowerCase().includes(q);
      const matchEmail = contact.email?.toLowerCase().includes(q);
      const matchObs = contact.observacao?.toLowerCase().includes(q);
      
      if (!matchNome && !matchTelefone && !matchEmail && !matchObs) {
        return false;
      }
    }
    
    return true;
  });

  // Atualiza as Estatísticas no painel
  updateStatistics();

  // Caso não existam contatos que satisfaçam as seleções
  if (filtered.length === 0) {
    elements.contactsGrid.classList.add("d-none");
    elements.contactsListContainer.classList.add("d-none");
    elements.emptyState.classList.remove("d-none");
    
    if (contacts.length === 0) {
      elements.emptyStateMessage.textContent = "Você ainda não possui nenhum contato cadastrado. Crie um novo contato abaixo ou experimente carregar os nossos dados fictícios de teste!";
      elements.loadSamplesBtn.classList.remove("d-none");
    } else {
      elements.emptyStateMessage.textContent = "Nenhum dos seus contatos corresponde aos filtros selecionados. Tente limpar o filtro de busca ou alterar a categoria.";
      elements.loadSamplesBtn.classList.add("d-none");
    }
    return;
  }

  // Se houver contatos, esconde a tela vazia
  elements.emptyState.classList.add("d-none");

  // Renderiza no Layout selecionado
  if (layoutMode === "grid") {
    elements.contactsListContainer.classList.add("d-none");
    elements.contactsGrid.classList.remove("d-none");
    renderGrid(filtered);
  } else {
    elements.contactsGrid.classList.add("d-none");
    elements.contactsListContainer.classList.remove("d-none");
    renderList(filtered);
  }
}

// Renderiza Layout Grid (Cards Individuais)
function renderGrid(list) {
  elements.contactsGrid.innerHTML = "";
  
  list.forEach((contact, index) => {
    const col = document.createElement("div");
    col.className = "col-lg-3 col-md-4 col-sm-6 col-12 animate-fade-in";
    
    const initials = getInitials(contact.nome);
    const avatarIndex = getDeterministicAvatarColorIndex(contact.nome);
    const isStarred = contact.favorito ? "starred bi-star-fill" : "bi-star";
    
    // Formata o e-mail ou oculta caso não exista
    const emailHtml = contact.email 
      ? `<div class="text-truncate small text-muted mb-2 mb-md-3"><i class="bi bi-envelope me-1"></i>${contact.email}</div>`
      : `<div class="text-truncate small text-transparent mb-2 mb-md-3"><i class="bi bi-envelope me-1"></i>Vazio</div>`;
      
    // Criação do elemento HTML interno de cada card de contato
    col.innerHTML = `
      <div class="card contact-card h-100 p-3" id="card-${contact.id}">
        <!-- Top Toolbar do Card -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="badge badge-categoria ${getCategoryBadgeClass(contact.categoria)}">${contact.categoria}</span>
          <i class="bi ${isStarred} favorite-star" data-id="${contact.id}" data-status="${contact.favorito}" title="${contact.favorito ? 'Desfavoritar' : 'Favoritar'}"></i>
        </div>
        
        <!-- Clique para Detalhar -->
        <div class="card-clickable-area flex-grow-1 cursor-pointer" style="cursor: pointer;" data-id="${contact.id}">
          <!-- Info de Perfil -->
          <div class="d-flex align-items-center gap-3 mb-3">
            <div class="contact-avatar avatar-${avatarIndex}" id="avatar-${contact.id}">
              ${initials}
            </div>
            <div class="overflow-hidden">
              <h5 class="card-title h6 fw-bold m-0 text-dark text-truncate" title="${contact.nome}">${contact.nome}</h5>
              <span class="small fw-medium text-primary d-block mt-1"><i class="bi bi-telephone-fill me-1"></i>${contact.telefone}</span>
            </div>
          </div>
          ${emailHtml}
        </div>
        
        <!-- Botão de Ver Completo -->
        <div class="border-top pt-2 d-flex justify-content-between align-items-center bg-transparent mt-auto">
          <span class="small text-muted font-monospace" style="font-size: 0.7rem;">Salvo em ${formatSimpleDate(contact.created_at)}</span>
          <button class="btn btn-sm btn-link text-primary fw-semibold p-0 text-decoration-none view-more-btn" data-id="${contact.id}">
            Ver Detalhes <i class="bi bi-arrow-right small"></i>
          </button>
        </div>
      </div>
    `;
    
    // Event Listeners locais de cliques no card
    col.querySelector(".favorite-star").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleContactFavorite(contact.id, contact.favorito);
    });
    
    col.querySelector(".card-clickable-area").addEventListener("click", () => {
      openContactDetailsModal(contact);
    });
    
    col.querySelector(".view-more-btn").addEventListener("click", () => {
      openContactDetailsModal(contact);
    });
    
    elements.contactsGrid.appendChild(col);
  });
}

// Renderiza Layout de Tabela
function renderList(list) {
  elements.contactsListBody.innerHTML = "";
  
  list.forEach(contact => {
    const tr = document.createElement("tr");
    tr.id = `row-${contact.id}`;
    
    const initials = getInitials(contact.nome);
    const avatarIndex = getDeterministicAvatarColorIndex(contact.nome);
    const isStarred = contact.favorito ? "starred bi-star-fill" : "bi-star";
    
    tr.innerHTML = `
      <td>
        <div class="contact-avatar avatar-${avatarIndex}" style="width: 40px; height: 40px; font-size: 0.95rem;">
          ${initials}
        </div>
      </td>
      <td>
        <div class="fw-bold text-dark text-truncate" style="max-width: 250px;">${contact.nome}</div>
        <div class="d-md-none small text-muted text-truncate">${contact.email || "Sem e-mail"}</div>
      </td>
      <td class="fw-medium text-primary">${contact.telefone}</td>
      <td class="d-none d-md-table-cell text-muted text-truncate" style="max-width: 200px;">${contact.email || '<span class="text-muted text-opacity-50">Não informado</span>'}</td>
      <td class="d-none d-lg-table-cell">
        <span class="badge badge-categoria ${getCategoryBadgeClass(contact.categoria)}">${contact.categoria}</span>
      </td>
      <td class="text-end">
        <div class="d-inline-flex gap-2">
          <button class="btn btn-sm btn-link text-warning p-0 list-star-btn" data-id="${contact.id}" data-status="${contact.favorito}">
            <i class="bi ${isStarred} favorite-star"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary p-1 rounded-circle border-0 text-primary list-view-btn" title="Ver Detalhes" data-id="${contact.id}">
            <i class="bi bi-eye-fill fs-6"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary p-1 rounded-circle border-0 text-success list-edit-btn" title="Editar" data-id="${contact.id}">
            <i class="bi bi-pencil-fill fs-6"></i>
          </button>
        </div>
      </td>
    `;
    
    // Bind eventos locais
    tr.querySelector(".list-star-btn").addEventListener("click", () => {
      toggleContactFavorite(contact.id, contact.favorito);
    });
    
    tr.querySelector(".list-view-btn").addEventListener("click", () => {
      openContactDetailsModal(contact);
    });
    
    tr.querySelector(".list-edit-btn").addEventListener("click", () => {
      prepareFormForEdit(contact);
    });
    
    elements.contactsListBody.appendChild(tr);
  });
}

// Atualizar as estatísticas mostradas na tela superior
function updateStatistics() {
  const total = contacts.length;
  const favorites = contacts.filter(c => c.favorito).length;
  const trabalho = contacts.filter(c => c.categoria === "Trabalho").length;
  const familia = contacts.filter(c => c.categoria === "Família").length;
  
  elements.statTotal.textContent = total;
  elements.statFavorites.textContent = favorites;
  elements.statTrabalho.textContent = trabalho;
  elements.statFamilia.textContent = familia;
}

// --- CONTROLE DE FILTRO E BUSCA ---
function handleSearch(e) {
  searchQuery = e.target.value;
  
  // Mostra ou esconde o botão de limpar busca
  if (searchQuery.trim() !== "") {
    elements.clearSearchBtn.style.display = "block";
  } else {
    elements.clearSearchBtn.style.display = "none";
  }
  
  renderContacts();
}

function clearSearch() {
  elements.searchInput.value = "";
  searchQuery = "";
  elements.clearSearchBtn.style.display = "none";
  renderContacts();
}

// --- ALTERNAR LAYOUT ---
function changeLayout(mode) {
  layoutMode = mode;
  localStorage.setItem("agenda_layout_mode", mode);
  updateLayoutUI();
  renderContacts();
}

function updateLayoutUI() {
  if (layoutMode === "grid") {
    elements.gridToggle.classList.add("active");
    elements.listToggle.classList.remove("active");
  } else {
    elements.listToggle.classList.add("active");
    elements.gridToggle.classList.remove("active");
  }
}

// --- SEED SEPARADO DE CONTATOS DE EXEMPLO ---
async function handleLoadSampleContacts() {
  const loadingText = isSupabaseConfigured() ? "Carregando exemplos para a Nuvem..." : "Carregando exemplos rápidos...";
  elements.contactsSpinner.querySelector("p").textContent = loadingText;
  
  elements.contactsSpinner.classList.remove("d-none");
  elements.emptyState.classList.add("d-none");
  
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      // Insere cada elemento via API
      for (const contact of SAMPLE_CONTACTS) {
        // Remove ID estático local para o Supabase gerar UUIDs nativos
        const { id, ...dto } = contact;
        const { error } = await supabase.from('contatos').insert([dto]);
        if (error) {
          console.error("Erro ao subir exemplo:", error);
        }
      }
      showToast("Exemplos Carregados", "Contatos de demonstração criados no seu banco Supabase!", "success");
    } else {
      contacts = [...SAMPLE_CONTACTS];
      saveContactsToLocalStorage();
      showToast("Exemplos Carregados", "Contatos fictícios adicionados ao seu navegador em cache local.", "success");
    }
  } catch (error) {
    console.error(error);
    showToast("Erro ao carregar", "Houve um problema ao semear contatos rápidos: " + error.message, "danger");
  } finally {
    await loadAndRenderContacts();
  }
}

// --- MODAL DE DETALHES GERAL ---
function openContactDetailsModal(contact) {
  const initials = getInitials(contact.nome);
  const avatarIndex = getDeterministicAvatarColorIndex(contact.nome);
  
  // Seta e armazena os dados do contato ativo no próprio modal
  elements.contactDetailsModalElement.setAttribute("data-active-id", contact.id);
  elements.contactDetailsModalElement.setAttribute("data-active-nome", contact.nome);
  elements.contactDetailsModalElement.setAttribute("data-active-favorito", contact.favorito);
  
  // Atualiza estrela favorito
  elements.detailFavoriteStar.className = contact.favorito ? "bi bi-star-fill favorite-star starred" : "bi bi-star favorite-star";
  
  // Preenche dados visuais
  elements.detailAvatar.className = `contact-avatar mb-3 avatar-${avatarIndex}`;
  elements.detailAvatar.textContent = initials;
  elements.detailName.textContent = contact.nome;
  
  elements.detailCategory.textContent = contact.categoria;
  elements.detailCategory.className = `badge badge-categoria ${getCategoryBadgeClass(contact.categoria)}`;
  
  elements.detailPhone.textContent = contact.telefone;
  elements.detailCallLink.href = `tel:${contact.telefone.replace(/\D/g, "")}`;
  
  if (contact.email) {
    elements.detailEmailContainer.style.display = "block";
    elements.detailEmail.innerHTML = contact.email;
    elements.detailEmailLink.href = `mailto:${contact.email}`;
  } else {
    elements.detailEmailContainer.style.display = "none";
  }
  
  if (contact.observacao) {
    elements.detailNotesContainer.style.display = "block";
    elements.detailNotes.textContent = contact.observacao;
  } else {
    elements.detailNotesContainer.style.display = "none";
  }
  
  // Reseta botão de excluir para o estado original caso estivesse em contagem de confirmação
  resetDeleteConfirmBtn();
  
  // Exibe o modal detalhado
  bootstrapDetailsModalInstance.show();
}

// Clica para editar a partir de dentro do detalhe
function handleDetailEdit() {
  const activeId = elements.contactDetailsModalElement.getAttribute("data-active-id");
  const contact = contacts.find(c => c.id === activeId);
  if (!contact) return;
  
  bootstrapDetailsModalInstance.hide();
  
  setTimeout(() => {
    prepareFormForEdit(contact);
  }, 350); // Delay suave por causa da transição de fechar modal
}

// Prepara e carrega formulário de contato para EDIÇÃO
function prepareFormForEdit(contact) {
  elements.contactFormModalLabel.innerHTML = `<i class="bi bi-pencil-square text-success me-2"></i>Editar Contato`;
  elements.contactIdInput.value = contact.id;
  elements.contactName.value = contact.nome;
  elements.contactPhone.value = contact.telefone;
  elements.contactEmail.value = contact.email || "";
  elements.contactCategory.value = contact.categoria;
  elements.contactFavorite.checked = contact.favorito;
  elements.contactNotes.value = contact.observacao || "";
  
  bootstrapFormModalInstance.show();
}

// Clica para excluir a partir de dentro do detalhe (com UX de segurança interna no botão)
function handleDetailDelete() {
  const activeId = elements.contactDetailsModalElement.getAttribute("data-active-id");
  const activeNome = elements.contactDetailsModalElement.getAttribute("data-active-nome");
  
  if (!activeId) return;
  
  // Se já for o segundo clique rápido, realiza a exclusão definitiva
  if (activeDeleteId === activeId) {
    clearTimeout(deleteConfirmTimeout);
    elements.detailDeleteBtn.disabled = true;
    elements.detailDeleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Removendo...`;
    
    performDeleteContact(activeId, activeNome);
    
    activeDeleteId = null;
  } else {
    // Primeiro clique de gatilho, muda aparência do botão e aguarda re-confirmação
    activeDeleteId = activeId;
    elements.detailDeleteBtn.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>Clique de Novo para Confirmar`;
    elements.detailDeleteBtn.className = "btn btn-dark flex-fill py-2 rounded-3 text-warning fw-bold animate-shake";
    
    // Cancela confirmação caso o usuário não clique de novo após 3.5 segundos
    deleteConfirmTimeout = setTimeout(() => {
      resetDeleteConfirmBtn();
    }, 3500);
  }
}

function resetDeleteConfirmBtn() {
  elements.detailDeleteBtn.disabled = false;
  elements.detailDeleteBtn.className = "btn btn-danger flex-fill py-2 rounded-3";
  elements.detailDeleteBtn.innerHTML = `<i class="bi bi-trash3-fill me-1"></i>Excluir`;
  activeDeleteId = null;
  if (deleteConfirmTimeout) clearTimeout(deleteConfirmTimeout);
}

// Alterna favorito de dentro do modal de detalhes (Sincronizo com a view)
async function toggleDetailFavoriteInline() {
  const activeId = elements.contactDetailsModalElement.getAttribute("data-active-id");
  const currentStatusString = elements.contactDetailsModalElement.getAttribute("data-active-favorito");
  const currentStatus = currentStatusString === "true";
  
  await toggleContactFavorite(activeId, currentStatus);
  
  // Atualiza a visualização do modal de detalhes de volta de forma dinâmica
  const nextStatus = !currentStatus;
  elements.contactDetailsModalElement.setAttribute("data-active-favorito", nextStatus);
  elements.detailFavoriteStar.className = nextStatus ? "bi bi-star-fill favorite-star starred" : "bi bi-star favorite-star";
}


// --- AUXILIARES E UTILITÁRIOS ---

// Cria Toast na tela
export function showToast(title, subtitle, type = "primary") {
  const toastId = 'toast-' + Date.now();
  
  // Define o ícone com base no tipo
  let iconClass = "bi-info-circle-fill text-primary";
  if (type === "success") iconClass = "bi-check-circle-fill text-success";
  if (type === "warning") iconClass = "bi-exclamation-triangle-fill text-warning";
  if (type === "danger") iconClass = "bi-slash-circle-fill text-danger";
  
  const toastHtml = `
    <div id="${toastId}" class="toast custom-toast align-items-center" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="4000">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-start gap-2">
          <i class="bi ${iconClass} fs-5 mt-1"></i>
          <div>
            <strong class="text-dark d-block">${title}</strong>
            <span class="small text-muted">${subtitle}</span>
          </div>
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  
  elements.toastContainer.insertAdjacentHTML("beforeend", toastHtml);
  
  const toastElement = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(toastElement);
  bsToast.show();
  
  // Remove do DOM após sumir para não acumular lixo na interface
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

// Obtém as iniciais de um nome (Ex: "Gustavo Silva Modesto" -> "GM", "Beatriz" -> "B", etc.)
function getInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  const first = words[0][0];
  const last = words[words.length - 1][0];
  return (first + last).toUpperCase();
}

// Escolhe de forma determinística um índice de avatar com base no nome para manter a cor persistente
function getDeterministicAvatarColorIndex(name) {
  if (!name) return 0;
  let code = 0;
  for (let i = 0; i < name.length; i++) {
    code += name.charCodeAt(i);
  }
  return code % 8; // Mapeia para as 8 paletas CSS de avatars (avatar-0 a avatar-7)
}

// Retorna as classes de CSS dos badges das categorias
function getCategoryBadgeClass(category) {
  switch (category) {
    case "Trabalho": return "category-trabalho";
    case "Família": return "category-familia";
    case "Amigos": return "category-amigos";
    default: return "category-outros";
  }
}

// Formatação simples de timestamp
function formatSimpleDate(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
  } catch (e) {
    return "";
  }
}

// Copia o SQL para o Clipboard
function copySqlToClipboard() {
  const sqlText = elements.copySqlBtn.nextElementSibling.textContent;
  
  navigator.clipboard.writeText(sqlText).then(() => {
    elements.copySqlBtn.innerHTML = `<i class="bi bi-check-circle-fill"></i> Copiado!`;
    elements.copySqlBtn.className = "btn btn-sm btn-success position-absolute end-0 top-0 m-2";
    
    showToast("Copiado!", "Código SQL foi enviado para a área de transferência.", "success");
    
    setTimeout(() => {
      elements.copySqlBtn.innerHTML = `<i class="bi bi-clipboard"></i> Copiar`;
      elements.copySqlBtn.className = "btn btn-sm btn-outline-secondary position-absolute end-0 top-0 m-2";
    }, 2500);
  }).catch(err => {
    console.error("Falha ao copiar:", err);
    showToast("Erro ao Copiar", "Área de transferência inacessível. Copie manualmente o quadrado de texto.", "danger");
  });
}
