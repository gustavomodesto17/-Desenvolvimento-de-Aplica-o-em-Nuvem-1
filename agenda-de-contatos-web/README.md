# Agenda de Contatos Web (Bootstrap + Supabase)

Uma aplicação moderna, elegante, intuitiva e responsiva desenvolvida em **HTML5**, **CSS3**, **JavaScript Vanilla (ES6+)** e **Bootstrap 5**, totalmente integrada ao **Supabase** para persistência de dados em nuvem, com um sistema inteligente de fallback para **LocalStorage**.

---

## 🛠️ Conteúdo da Entrega

A estrutura solicitada foi entregue com arquivos desacoplados e organizados para fácil manutenção:
1. **`index.html`**: A interface principal estruturada com Bootstrap 5, incluindo modais personalizados para CRUD, janelas de detalhes e popups toast dinâmicos.
2. **`style.css`**: Estilização customizada que complementa o Bootstrap para proporcionar uma interface premium (avatares dinâmicos, efeitos hover modernos, realce de favoritos e transições suaves).
3. **`supabase.js`**: Módulo de comunicação que lê as credenciais e inicializa o cliente oficial do Supabase de forma segura.
4. **`app.js`**: O motor lógico em Javascript puro que gerencia as operações de CRUD, os filtros em tempo real, as estatísticas automáticas e os cenários offline/online.
5. **`README.md`**: Este manual de uso e configuração do projeto.

---

## 🔑 Onde colocar a URL e a anon_key do Supabase?

Existem **duas formas** fáceis e eficientes de configurar suas chaves do Supabase no projeto:

### Opção 1: Arquivo de Configuração de Ambiente (Recomendado)
Crie um arquivo chamado **`.env.local`** na raiz do projeto (onde está o `package.json`). O Vite que roda o servidor de desenvolvimento identificará essas variáveis automaticamente:

```env
# No seu arquivo .env.local
VITE_SUPABASE_URL=https://seu-id-de-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_categoria_anon_key_copiada_do_console
```

### Opção 2: Declaração Direta (Rápido para Testes Locais)
Abra o arquivo **`supabase.js`** e insira as de forma direta nas constantes do topo do arquivo:

```javascript
// No arquivo supabase.js (linhas 8 e 9):
export const SUPABASE_URL = "https://seu-id-de-projeto.supabase.co";
export const SUPABASE_ANON_KEY = "sua_categoria_anon_key_copiada_do_console";
```

> 💡 **Fallback Inteligente:** Se você abrir o projeto sem configurar as chaves do Supabase, não se preocupe! O aplicativo detectará automaticamente a ausência e ativará o **Modo Local Storage**. Um selo dourado no topo indicará *"Persistência em Cache Local"*, e o CRUD funcionará 100% de forma interativa salvando as informações no seu próprio navegador!

---

## 💾 Configuração da Tabela no Supabase

Para que a sincronização na nuvem funcione corretamente, você precisa criar a tabela `contatos`. Siga as etapas abaixo:

1. Acesse o painel do [Supabase](https://supabase.com/).
2. Abra o seu projeto e, no menu lateral esquerdo, clique em **SQL Editor**.
3. Clique em **New Query** (Nova Consulta).
4. Cole o código SQL abaixo e clique no botão **Run** (Executar):

```sql
-- Query para criar a tabela de contatos
CREATE TABLE contatos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  categoria text DEFAULT 'Outros'::text,
  observacao text,
  favorito boolean DEFAULT false NOT NULL
);

-- Habilitar Row Level Security (RLS) para proteção
ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;

-- Política de liberação de leitura e escrita públicas para testes rápidos
CREATE POLICY "Acesso Total Público de Contatos" ON contatos 
  FOR ALL USING (true) WITH CHECK (true);
```

---

## ✨ Recursos Implementados

* **CRUD Completo:**
  * **Criar:** Formulário inteligente com validações nativas do Bootstrap.
  * **Ler:** Duas opções de layout com transições fluidas:
    * *Visualização em Grid (Cards):* Focado em design moderno, mostrando avatares dinâmicos (iniciais geradas automaticamente baseadas no nome) e destaques.
    * *Visualização em Lista:* Uma tabela limpa e compacta focada em produtividade.
  * **Atualizar:** Edição total dos campos ou alternação rápida de favorito com apenas um clique diretamente no card ou tabela.
  * **Excluir:** Exclusão inteligente integrada ao modal de detalhes do contato. Em vez de usar `window.confirm` simples (que pode travar), criamos um botão de confirmação em duas etapas (*"Clique de Novo para Confirmar"*) para prevenir exclusões acidentais de forma segura dentro do iFrame.
* **Busca em Tempo Real (Filtro Instantâneo):** Busca por Nome, Telefone, Email ou Observações conforme você digita.
* **Filtros Multifuncionais:** Filtre instantaneamente por Categoria (Trabalho, Família, Amigos, Outros) ou selecione para ver apenas os Favoritos.
* **Dashboard de Estatísticas:** Quatro contadores em tempo real no topo medindo total de contatos, favoritos e totais por categoria.
* **Seeding de Amostra:** Se a lista inicial estiver vazia, um clique no botão "Carregar Exemplos" cria contatos fictícios para você ver a interface funcionando instantaneamente.
* **Toasts de Notificação:** Avisos flutuantes, modernos e coloridos substituem alertas tradicionais do navegador.
