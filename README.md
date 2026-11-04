# Bancada de Arquitetura

Simulador para praticar arquitetura de software sem depender do código de nenhuma empresa. Você escolhe um cenário fictício com números concretos (volume, latência, restrições), desenha os containers num canvas estilo Miro, registra as decisões e recebe feedback de uma IA que vê o seu desenho a cada mensagem.

## O que tem

- **Cenários**: encurtador de links, app de delivery, venda de ingressos, agenda de clínicas e um cenário livre. Cada um tem uma mudança de requisito para revelar depois do primeiro desenho.
- **Canvas estilo Miro**: componentes de arquitetura (20 tipos, com explicação de o que é, quando usar e cuidados), notas adesivas, textos, áreas que agrupam e levam junto o que está dentro, imagens (seletor, arrastar arquivo ou colar com Ctrl+V), conexões com rótulo, síncronas ou assíncronas, em três traçados.
- **Controles**: selecionar e mover o quadro, seleção em caixa, zoom e enquadrar, minimapa, grade magnética, modo mouse ou trackpad, desfazer e refazer, copiar, colar e duplicar, atalhos de teclado.
- **Decisões (ADRs)** e **perguntas de arquiteto** para autoavaliação.
- **IA integrada**: escolha Anthropic (Claude), OpenAI (GPT) ou Google (Gemini), cole a sua chave e converse. O resumo do quadro vai junto em toda mensagem; dá para anexar uma imagem do quadro.
- **Resumo para qualquer IA**: um botão gera o texto do exercício para colar em qualquer chat.
- **Arquivo**: exportar PNG do quadro inteiro, JSON (para guardar ou levar a outro navegador), Markdown, e importar JSON.

Os quadros ficam salvos no navegador (IndexedDB), um por cenário.

## Publicar na Vercel

1. Entre em [vercel.com/new](https://vercel.com/new) e importe este repositório.
2. A Vercel detecta Next.js sozinha. Não precisa de variável de ambiente.
3. Clique em **Deploy**. A cada push na `main`, uma nova versão sobe.

## Rodar localmente

```bash
npm install
npm run dev
# http://localhost:3000
```

Outros comandos: `npm run build`, `npm run typecheck`, `npm run smoke` (teste de ponta a ponta com Playwright contra o app rodando em `localhost:3000`).

## Como funciona a chave da IA

Cada pessoa usa a própria chave. Ela fica guardada só no navegador de quem usa (ou só na aba, se desmarcar "Lembrar") e vai a cada mensagem para a rota `/api/chat` deste app, que repassa ao provedor e devolve a resposta em streaming. O servidor não guarda nem registra a chave. O custo de uso é cobrado na conta do provedor de quem colou a chave.

Os modelos sugeridos podem ficar desatualizados; o botão **Buscar modelos** lista os modelos disponíveis na conta da pessoa.

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
