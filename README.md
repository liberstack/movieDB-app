# 🎬 Nebula Movies

Aplicação web para buscar filmes, séries e episódios usando a [API da OMDb](https://www.omdbapi.com/), escrita em **TypeScript puro** — sem framework, sem bundler, sem dependência de runtime. Só DOM, `fetch` e módulos ES nativos do browser.

Esse README existe pra explicar **como o projeto é organizado** e **por que** ele foi organizado assim, então mesmo que você não tenha escrito uma linha dele, consiga entender o fluxo em poucos minutos.

---

## 1. Visão geral rápida

O usuário digita um título, escolhe filtros opcionais (tipo, década, gênero, país) e clica em buscar. A aplicação:

1. Consulta a OMDb pra descobrir **quais IDs de filme** batem com o título buscado.
2. Busca os **detalhes completos** de cada ID em paralelo (limitado, pra não estourar rate limit).
3. Filtra os resultados localmente pelos filtros que a OMDb não suporta direto (gênero, país, década).
4. Renderiza a lista, ordenada por nota do IMDb.
5. Ao clicar num item, abre um modal com sinopse, elenco, prêmios, notas etc.

Não tem backend próprio — o browser conversa direto com `omdbapi.com`.

---

## 2. Estrutura de pastas

```
nebula-movies/
├── src/                      # todo o código-fonte TypeScript
│   ├── main.ts                # ponto de entrada da aplicação
│   ├── search.ts               # tela de busca: filtros, fetch, orquestração
│   ├── modal.ts                  # abrir/fechar o modal de detalhes
│   ├── detail.ts                   # monta o HTML interno do modal
│   └── types.ts                     # contratos de tipo da API da OMDb
│
├── dist/                      # JS compilado (gerado pelo tsc — não vai pro git)
├── index.html                 # HTML raiz, carrega dist/main.js como módulo ES
├── style.css                  # estilos globais
├── tsconfig.json              # configuração do compilador TypeScript
├── package.json                # scripts (build/dev) e dependência de dev (typescript)
├── package-lock.json
├── .gitignore                  # ignora node_modules/ e dist/
└── .github/
    └── workflows/
        └── deploy.yml           # build + deploy automático pro GitHub Pages
```

**Por que `dist/` não vai pro git?** Porque é **gerado**, não é fonte. Todo build artefato (coisa que pode ser recriada a partir do código-fonte) fica de fora do controle de versão — quem precisa dele é a etapa de deploy, que gera na hora (veja a seção 6).

---

## 3. Arquitetura: como as peças se encaixam

Não tem Redux, não tem componente, não tem estado global complexo. É o padrão mais simples que existe pra DOM puro: **funções que recebem um elemento e populam ele com HTML + listeners.**

### 3.1 Grafo de dependências entre módulos

```
main.ts
  └─▶ search.ts
        ├─▶ modal.ts
        │     └─▶ detail.ts
        └─▶ types.ts (tipos, sem lógica)
```

- `main.ts` não sabe nada sobre filmes. Só pega a `<main id="app">` do HTML e delega tudo pra `search.ts`.
- `search.ts` é o "controller" da tela: sabe montar o formulário, disparar buscas, filtrar e renderizar a lista.
- `modal.ts` é genérico: só sabe abrir/fechar um overlay. Não sabe *o que* tem dentro — quem monta o conteúdo é o `detail.ts`.
- `detail.ts` é puramente uma função que transforma um objeto `OMDbDetail` em uma string HTML. Não manipula DOM diretamente, não tem estado.
- `types.ts` não tem lógica nenhuma — só descreve o formato dos dados que a OMDb devolve, pra o TypeScript te avisar em tempo de compilação se você tentar acessar `movie.Titulo` em vez de `movie.Title`.

Essa separação existe pra cada arquivo ter **uma responsabilidade só**: buscar dado é diferente de filtrar, que é diferente de renderizar lista, que é diferente de renderizar modal.

### 3.2 Fluxo de uma busca, passo a passo

```
usuário digita "blade runner" e clica em Search
        │
        ▼
doSearch()                         [dentro de search.ts]
   valida se o campo não tá vazio
        │
        ▼
searchMovies(title, type, genre, country)
        │
        ├─▶ fetchIds(title, type, startYear, endYear)
        │     busca IDs na OMDb (endpoint "s=")
        │     • sem filtro de década: 1 request
        │     • com filtro de década: 1 request por ano, em paralelo
        │       (limitado por mapLimit, pra não estourar rate limit)
        │     devolve { ids, failedYears }
        │
        ├─▶ mapLimit(ids, ..., fetch detail)
        │     busca o detalhe de CADA id (endpoint "i=")
        │     também limitado em paralelo
        │
        ├─▶ matchesFilters(movie, genre, country, startYear, endYear)
        │     filtra localmente o que a OMDb não filtra na URL
        │     (gênero e país não são parâmetros da API de busca)
        │
        ├─▶ sort por imdbRating, decrescente
        │
        └─▶ renderMovieLi(movie, resultsEl) para cada resultado
              cria o <li>, registra o clique → openModal(movie)
```

### 3.3 Por que existe `mapLimit`?

A OMDb tem uma **key gratuita e limite de requisições**. Se você buscar com filtro de "1980s", ingenuamente isso significa 10 anos × N páginas × N detalhes — facilmente **centenas de requests simultâneos** se disparados todos de uma vez com `Promise.all`.

`mapLimit` é um "pool de workers" simples: só deixa `N` requests rodando ao mesmo tempo (hoje `N = DETAIL_CONCURRENCY = 6`), e assim que uma termina, a próxima da fila começa. Isso é aplicado em **duas camadas** dentro de `fetchIds`:

1. Primeiro busca a página 1 de cada ano (respeitando o limite).
2. Depois busca as páginas extras de todos os anos juntas, também respeitando o limite — em vez de cada ano ter seu próprio limite paralelo isolado (o que somaria muito mais que 6 requests reais ao mesmo tempo).

Cada busca de ano roda dentro de um `try/catch` isolado: se um ano falhar (timeout, erro de rede), os outros continuam normalmente e o usuário só vê um aviso tipo "1 ano falhou na busca", em vez da tela inteira quebrar.

### 3.4 O modal é "burro" de propósito

`openModal()` não sabe nada sobre filme — ele só:
1. Cria (ou reaproveita) uma `<div id="movie-modal-overlay">`.
2. Pede pro `detail.ts` montar o HTML de dentro (`buildDetailHTML`).
3. Cuida do genérico: fechar no ESC, fechar clicando fora, trocar poster quebrado por um placeholder.

Isso significa que se amanhã você quiser um modal pra outra coisa (tipo detalhes de um ator), você reaproveita `modal.ts` inteiro e só troca a função que monta o HTML.

---

## 4. Tipagem (`types.ts`)

O TypeScript não muda nada em tempo de execução — ele existe só pra te avisar **em tempo de compilação** quando você tenta usar um campo que não existe ou passar o tipo errado. Aqui os tipos espelham exatamente o JSON que a OMDb devolve:

- `OMDbSearchResponse` → o que vem do endpoint de busca (`?s=...`), uma lista resumida de filmes.
- `OMDbDetail` → o que vem do endpoint de detalhe (`?i=...`), com sinopse, elenco, notas etc.

Campos opcionais (`Poster?`, `BoxOffice?`) são marcados com `?` porque a OMDb às vezes simplesmente não manda essas chaves, dependendo do filme.

---

## 5. Como rodar localmente

```bash
# instalar a única dependência de dev (o próprio compilador TS)
npm install

# compilar src/*.ts → dist/*.js uma vez
npm run build

# ou, pra recompilar automaticamente a cada mudança
npm run dev
```

**Importante:** como `index.html` carrega `dist/main.js` como `<script type="module">`, o navegador exige que os arquivos venham de um servidor HTTP — abrir o `index.html` direto com `file://` não funciona (módulos ES bloqueiam por CORS/protocolo). Suba um servidor estático simples, por exemplo:

```bash
npx serve .
# ou
python3 -m http.server
```

---

## 6. Build e deploy (`.github/workflows/deploy.yml`)

A cada push na branch `main`, o GitHub Actions:

1. Instala as dependências (`npm install`).
2. Compila o TypeScript (`npx tsc`) — isso gera `dist/` do zero, já que ele não existe no git.
3. Monta uma pasta `deploy/` com tudo que o site precisa pra funcionar em produção: `dist/`, `src/`, `index.html`, `style.css`, `package.json`.
4. Publica o conteúdo de `deploy/` na branch `gh-pages`, via `peaceiris/actions-gh-pages`, que o GitHub Pages serve como site estático.

Ou seja: você nunca builda manualmente pra produção — só dá push na `main` e o pipeline cuida do resto.

---

## 7. Limitações conhecidas

- A key da OMDb usada (`trilogy`) é uma **key pública de teste**, com limite de requisições — não é uma chave paga/privada. Pra uso sério, trocar por uma key própria.
- Como não tem backend, a key fica **exposta no código do cliente**. Isso é aceitável pra uma key de teste gratuita, mas não seria pra uma key paga.
- Buscas com filtro de década fazem múltiplos requests (um por ano) — mesmo limitados por `mapLimit`, buscas muito amplas ainda podem demorar alguns segundos.

---

## 8. Créditos

Dados fornecidos pela [OMDb API](https://www.omdbapi.com/).
Projeto: [github.com/liberstack](https://github.com/liberstack)