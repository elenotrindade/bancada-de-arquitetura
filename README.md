# Bancada de Arquitetura

Simulador para praticar arquitetura de software com cenários fictícios. Você desenha os containers num canvas, registra as decisões e recebe feedback de uma IA que acompanha o desenho.

## Recursos

- **Cenários** com requisitos, atributos de qualidade e restrições concretas, além de um cenário livre. Cada um tem uma mudança de requisito para revelar depois do primeiro desenho.
- **Canvas** com 22 tipos de componente, notas, textos, áreas de agrupamento, imagens e conexões síncronas ou assíncronas.
- **Decisões (ADRs)** e perguntas de autoavaliação.
- **Feedback de IA** com Anthropic, OpenAI ou Google, usando a chave de cada pessoa.
- **Resumo do exercício** em texto, com diagrama Mermaid, para usar em qualquer chat de IA.
- **Exportação** do quadro em PNG e do resumo em Markdown.

## Desenvolvimento

```bash
npm install
npm run dev
```

Outros comandos: `npm run build`, `npm run typecheck`.

## Testes

Depois de `npm run build`:

```bash
npx playwright install chromium
npm test         # testes funcionais
npm run bench    # benchmark de desempenho
```

Os limites de desempenho ficam em `tests/perf/orcamentos.json`.

## Privacidade

A chave de API fica só no navegador de quem usa e nunca é gravada em texto puro. O conteúdo dos quadros é salvo localmente no navegador.

## Atalhos

| Atalho | Ação |
| --- | --- |
| V / H | Selecionar / mover o quadro |
| C | Abrir componentes |
| N / T / F / I | Nota, texto, área, imagem |
| Espaço + arrastar | Mover o quadro |
| Shift + clique ou arrastar | Selecionar vários |
| Ctrl C / V / X / D | Copiar, colar, recortar, duplicar |
| Ctrl Z / Ctrl Shift Z | Desfazer / refazer |
| Enter ou duplo clique | Editar texto, título de área ou rótulo de conexão |
| Delete | Remover seleção |
| Ctrl + / Ctrl − / Ctrl 0 / Shift 1 | Zoom, 100%, enquadrar tudo |

## Estrutura

```
app/          páginas e rotas de API (Next.js App Router)
components/   canvas, barras de ferramentas, painéis e nós
lib/          catálogo, cenários, estado, persistência e resumo
tests/        testes funcionais e benchmark (Playwright)
```
