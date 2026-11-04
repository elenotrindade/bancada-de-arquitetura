# Bancada de Arquitetura

Simulador para praticar arquitetura de software sem depender do código de nenhuma empresa. Você escolhe um cenário fictício com números concretos (volume, latência, restrições), desenha os containers num canvas estilo Miro, registra as decisões e recebe feedback de uma IA que vê o seu desenho a cada mensagem.

## O que tem

- **Cenários**: encurtador de links, app de delivery, venda de ingressos, agenda de clínicas e um cenário livre. Cada um tem uma mudança de requisito para revelar depois do primeiro desenho.
- **Canvas estilo Miro**: componentes de arquitetura (20 tipos, com explicação de o que é, quando usar e cuidados), notas adesivas, textos, áreas que agrupam e levam junto o que está dentro, imagens (seletor, arrastar arquivo ou colar com Ctrl+V), conexões com rótulo, síncronas ou assíncronas, em três traçados.
- **Controles**: selecionar e mover o quadro, seleção em caixa, zoom e enquadrar, minimapa, grade magnética, modo mouse ou trackpad, desfazer e refazer, copiar, colar e duplicar, atalhos de teclado.
- **Decisões (ADRs)** e **perguntas de arquiteto** para autoavaliação.
- **IA integrada**: escolha Anthropic (Claude), OpenAI (GPT) ou Google (Gemini), cole a sua chave e converse. O resumo do quadro vai junto em toda mensagem; dá para anexar uma imagem do quadro.
- **Resumo para qualquer IA**: um botão gera o texto do exercício para colar em qualquer chat.
- **Arquivo**: exportar o quadro inteiro em PNG e o resumo em Markdown. O app só produz saídas: não importa arquivos de quadro.

Os quadros ficam salvos no navegador (IndexedDB), um por cenário, e são validados sempre que abertos.

## Publicar na Vercel

1. Entre em [vercel.com/new](https://vercel.com/new) e importe este repositório.
2. A Vercel detecta Next.js sozinha. Não precisa de variável de ambiente.
3. Clique em **Deploy**. A cada push na `main`, uma nova versão sobe.

## Telemetria

O app usa Vercel Web Analytics e Speed Insights, que não usam cookies e rodam no próprio domínio. Eles registram só visitas, páginas, país, dispositivo e desempenho; nada do quadro, do chat ou das chaves sai da página. Para ativar, abra o projeto na Vercel e ligue **Analytics** e **Speed Insights**. No plano Hobby: 50 mil eventos de Analytics por mês e 10 mil de Speed Insights a cada 30 dias.

## Rodar localmente

```bash
npm install
npm run dev
# http://localhost:3000
```

Outros comandos: `npm run build`, `npm run typecheck`.

## Bancada de testes

Depois de `npm run build`, rode:

```bash
npx playwright install chromium   # uma vez
npm test                          # testes funcionais
npm run bench                     # benchmark de desempenho + relatório
```

O servidor sobe sozinho. Os testes ficam em `tests/`:

| Arquivo | Cobre |
| --- | --- |
| `canvas.spec.ts` | Os 20 tipos de componente, notas, textos, áreas, imagens, conexões, barra do elemento, seleção, copiar e colar, desfazer, zoom, mão, grade e minimapa |
| `panels.spec.ts` | Cenários, mudança de requisito, perguntas, decisões, resumo, exportação e persistência |
| `chat.spec.ts` | Chat com respostas simuladas e uma chamada real com chave inválida, modelos, provedores e cofre da chave |
| `security.spec.ts` | CSP, cabeçalhos, rotas de IA, quadro adulterado, colar JSON externo, imagens e armazenamento |
| `responsive.spec.ts` | Celular e tema escuro, com capturas de tela no relatório |
| `perf/bench.spec.ts` | Carregamento (FCP, LCP, TBT, JS baixado) e quadros com 50, 150 e 300 componentes: FPS e tempo de quadro ao arrastar, mover, dar zoom e digitar, além de adicionar, desfazer, salvar, resumir, exportar e memória |

O benchmark roda com a CPU 4x mais lenta, como o Lighthouse, para simular um notebook comum. Os limites ficam em `tests/perf/orcamentos.json`; se algum estourar, o CI falha. No GitHub, o resultado aparece no resumo de cada execução do CI, e o relatório completo do Playwright fica nos artefatos.

## Segurança

**Chave de API.** Cada pessoa usa a própria chave, e ela nunca fica em texto puro no navegador:

- Sem salvar, ela existe só na memória da aba e some ao recarregar.
- Salva, ela fica num cofre no IndexedDB, cifrada com AES-GCM 256 usando uma chave derivada da senha da pessoa (PBKDF2-SHA256, 600 mil iterações, sal aleatório). Sem a senha, ninguém lê, nem quem copiar os dados do navegador. A cada visita a senha é pedida de novo.
- Nada vai para localStorage ou sessionStorage; chaves gravadas lá por versões antigas são apagadas automaticamente.
- A chave passa pela rota `/api/chat` só para chegar ao provedor. O servidor não grava nem registra a chave.
- Recomendação exibida no app: usar uma chave exclusiva para a Bancada, com limite de gasto mensal definido no painel do provedor. Se ela vazar, o prejuízo tem teto e a chave pode ser revogada sem afetar outros usos.

**Proteções na página.**

- Content Security Policy com nonce por requisição (`proxy.ts`): só rodam os scripts do próprio app, e `connect-src 'self'` impede que a página envie dados para qualquer outro endereço.
- Nada de fora vira elemento do quadro: não há importação de arquivo, o copiar e colar entre elementos fica na memória da aba, texto colado vira nota e imagens são sempre redesenhadas num canvas (o que descarta metadados como GPS e bloqueia SVG).
- Quadros lidos do armazenamento passam por validação: só tipos e campos conhecidos, imagens apenas como dados embutidos.
- A IA recebe a instrução de tratar o conteúdo do quadro como dado, nunca como ordem, e de nunca pedir chaves ou dados pessoais.
- Cabeçalhos: X-Frame-Options, HSTS, Permissions-Policy, Referrer-Policy, COOP e CORP.

**Rotas de servidor.** `/api/chat` e `/api/models` só aceitam requisições JSON vindas da própria página (Origin e Sec-Fetch-Site), com limites de tamanho. Scripts fora do navegador podem forjar cabeçalhos, então configure também um limite de requisições na Vercel:

1. No projeto, abra **Firewall** › **Configure** › **New Rule**.
2. Condição: *Request Path* começa com `/api/`.
3. Ação: **Rate Limit**, janela fixa de 60 s, 20 requisições por IP, resposta 429.
4. Salve e publique com **Review Changes** › **Publish**.

O plano Hobby permite uma regra de limite de requisições por projeto.

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
app/                 páginas e rotas de API (Next.js App Router)
  api/chat/          repassa a conversa ao provedor escolhido, em streaming
  api/models/        lista modelos disponíveis na conta do usuário
components/          canvas, barras de ferramentas, painéis e nós
lib/                 catálogo de componentes, cenários, estado (zustand), persistência, resumo e integração com provedores
scripts/smoke.mjs    teste de ponta a ponta usado no CI
```

Feito com Next.js, React Flow, zustand, idb-keyval, html-to-image e react-markdown.
