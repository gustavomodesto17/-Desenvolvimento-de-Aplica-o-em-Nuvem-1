/**
 * Configuração e Conexão do Supabase
 * 
 * Este arquivo lê as chaves do Supabase da sua configuração do Vite (variáveis de ambiente)
 * ou permite o fallback automático para o LocalStorage se as chaves não estiverem configuradas.
 */

// Chaves do Supabase obtidas via variáveis de ambiente do Vite
// Você pode configurá-las no arquivo .env.local como:
// VITE_SUPABASE_URL=sua_url_aqui
// VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let supabaseClient = null;
let isConfigured = false;

// Verifica se as variáveis de ambiente necessárias foram preenchidas e não são as padrão
const isValidUrl = SUPABASE_URL && SUPABASE_URL.trim() !== "" && !SUPABASE_URL.includes("SUA_SUPABASE_URL");
const isValidKey = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.trim() !== "" && !SUPABASE_ANON_KEY.includes("SUA_CHAVE_ANON_AQUI");

if (isValidUrl && isValidKey) {
  try {
    // Verifica se a biblioteca do Supabase está disponível no escopo global (carregada via CDN)
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      isConfigured = true;
      console.log("▲ Supabase: Conectado e configurado com sucesso!");
    } else {
      console.warn("▲ Supabase: Biblioteca do Supabase JS não foi encontrada no objeto window. Verifique se o script do CDN foi incluído no index.html.");
    }
  } catch (error) {
    console.error("▲ Supabase: Erro crítico ao criar o cliente do Supabase:", error);
  }
} else {
  console.log("▲ Supabase: Chaves não configuradas ou incompletas no .env.local. Rodando aplicação em 'Modo Local Storage'.");
}

/**
 * Retorna a instância ativa do cliente do Supabase
 * @returns {object|null}
 */
export function getSupabase() {
  return supabaseClient;
}

/**
 * Retorna se o Supabase está ativado e pronto para uso
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return isConfigured;
}
