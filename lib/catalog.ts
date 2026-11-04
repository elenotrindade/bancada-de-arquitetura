export type GroupId = 'cli' | 'ent' | 'proc' | 'dados' | 'msg' | 'ops';

export const GROUPS: { id: GroupId; label: string; color: string; mini: string }[] = [
  { id: 'cli', label: 'Clientes', color: 'var(--g-cli)', mini: '#4A7BC4' },
  { id: 'ent', label: 'Entrada', color: 'var(--g-ent)', mini: '#9068C8' },
  { id: 'proc', label: 'Processamento', color: 'var(--g-proc)', mini: '#2E8E6C' },
  { id: 'dados', label: 'Dados', color: 'var(--g-dados)', mini: '#BE7130' },
  { id: 'msg', label: 'Mensageria', color: 'var(--g-msg)', mini: '#C04F75' },
  { id: 'ops', label: 'Operação', color: 'var(--g-ops)', mini: '#71808A' }
];

export type CatalogItem = {
  g: GroupId;
  abbr: string;
  label: string;
  what: string;
  when: string;
  care: string;
};

export const CATALOG = {
  usuario: { g: 'cli', abbr: 'USR', label: 'Pessoa usuária', what: 'Quem usa o sistema. Não é software, mas aparece no desenho para mostrar de onde vem cada pedido.', when: 'Sempre que houver papéis diferentes (cliente, atendente, admin): um por papel.', care: 'Cada papel costuma ter permissões e volumes de uso diferentes.' },
  web: { g: 'cli', abbr: 'WEB', label: 'App web', what: 'Interface que roda no navegador e conversa com o back-end por rede.', when: 'Painéis, sites e sistemas internos.', care: 'Nunca confie no que vem do navegador: toda regra importante é validada no servidor.' },
  mobile: { g: 'cli', abbr: 'MOB', label: 'App mobile', what: 'Aplicativo instalado no celular, com rede instável e versões antigas convivendo.', when: 'Uso em movimento, notificações push, câmera, GPS.', care: 'Você não controla quando o usuário atualiza: a API precisa aceitar versões antigas do app.' },
  externo: { g: 'cli', abbr: 'EXT', label: 'Sistema externo', what: 'Serviço de terceiros que você não controla: pagamento, mapas, e-mail, parceiros.', when: 'Sempre que depender de algo fora do seu time.', care: 'Ele vai cair e ficar lento. Defina timeout, novas tentativas e o que o seu sistema faz enquanto isso.' },
  cdn: { g: 'ent', abbr: 'CDN', label: 'CDN', what: 'Rede de servidores espalhados que guarda cópias de arquivos e respostas perto do usuário.', when: 'Arquivos estáticos, imagens, vídeos e respostas que mudam pouco.', care: 'Cache na borda significa conteúdo velho por um tempo: planeje como invalidar.' },
  lb: { g: 'ent', abbr: 'LB', label: 'Balanceador de carga', what: 'Distribui as requisições entre várias cópias do mesmo serviço.', when: 'Quando um serviço roda em mais de uma instância para aguentar volume ou falhas.', care: 'Só funciona bem se o serviço não guardar estado na memória de uma instância.' },
  realtime: { g: 'ent', abbr: 'WS', label: 'Tempo real (WebSocket/SSE)', what: 'Mantém conexões abertas com os apps para o servidor enviar atualizações na hora, sem o app ficar perguntando.', when: 'Status de pedido ao vivo, chat, painéis que mudam sozinhos.', care: 'Cada conexão fica presa a uma instância: para escalar, as instâncias recebem os eventos por um pub/sub. O app precisa reconectar e buscar o que perdeu enquanto esteve fora.' },
  gateway: { g: 'ent', abbr: 'GW', label: 'API Gateway', what: 'Porta de entrada única das APIs: roteia, autentica, limita taxa de uso.', when: 'Vários serviços expostos para fora, ou necessidade de controle central de acesso.', care: 'Vira ponto único de falha e de lentidão se fizer lógica de negócio.' },
  servico: { g: 'proc', abbr: 'API', label: 'Serviço / API', what: 'Aplicação que executa regras de negócio e responde a requisições.', when: 'Toda lógica de negócio síncrona: alguém pede e espera a resposta.', care: 'Defina o dono de cada dado. Dois serviços escrevendo na mesma tabela viram um só serviço disfarçado.' },
  worker: { g: 'proc', abbr: 'WRK', label: 'Worker', what: 'Processo que roda em segundo plano consumindo tarefas, sem ninguém esperando a resposta.', when: 'Envio de e-mail, geração de relatórios, processamento de imagens, integrações lentas.', care: 'Tarefas podem rodar duas vezes: o processamento precisa ser idempotente.' },
  funcao: { g: 'proc', abbr: 'FN', label: 'Função serverless', what: 'Código que roda sob demanda, cobrado por execução, sem servidor para manter.', when: 'Tarefas curtas e esporádicas, picos imprevisíveis, cola entre serviços.', care: 'Tempo de inicialização e limite de duração. Fica caro em uso contínuo e alto.' },
  auth: { g: 'proc', abbr: 'IAM', label: 'Identidade e acesso', what: 'Cuida de login, sessões, tokens e permissões.', when: 'Qualquer sistema com usuários. Quase sempre melhor usar pronto do que construir.', care: 'Se ele cair, ninguém entra. Tokens com validade evitam consultá-lo a cada requisição.' },
  sql: { g: 'dados', abbr: 'SQL', label: 'Banco relacional', what: 'Banco com tabelas, relacionamentos e transações (PostgreSQL, MySQL).', when: 'Dados com relações e regras de consistência: pedidos, pagamentos, estoque.', care: 'Escala de escrita é limitada; leitura escala com réplicas. Índices fazem mais diferença que hardware.' },
  nosql: { g: 'dados', abbr: 'NOSQL', label: 'Banco NoSQL', what: 'Bancos de documento, chave-valor ou colunares, desenhados para escalar horizontalmente.', when: 'Volume muito alto de escrita, acesso sempre pela mesma chave, esquema flexível.', care: 'Você modela pelas consultas, não pelas entidades. Consultas não previstas ficam caras.' },
  cache: { g: 'dados', abbr: 'CACHE', label: 'Cache', what: 'Memória rápida (Redis, por exemplo) com cópias de dados lidos com frequência.', when: 'Leituras repetidas do mesmo dado e respostas que precisam de milissegundos.', care: 'É cópia, não fonte da verdade. Decida o que acontece quando ele está vazio ou desatualizado.' },
  storage: { g: 'dados', abbr: 'S3', label: 'Armazenamento de arquivos', what: 'Guarda arquivos grandes por baixo custo (object storage, como S3).', when: 'Imagens, PDFs, vídeos, backups, exportações.', care: 'Guarde só a referência no banco. Arquivo público precisa de controle de acesso pensado.' },
  busca: { g: 'dados', abbr: 'IDX', label: 'Índice de busca', what: 'Motor de busca textual e filtros (Elasticsearch, OpenSearch).', when: 'Busca por texto livre, filtros combinados, autocompletar.', care: 'É uma cópia derivada do banco principal: precisa de sincronização e fica um pouco atrasado.' },
  fila: { g: 'msg', abbr: 'Q', label: 'Fila', what: 'Guarda tarefas até um worker processar. Cada mensagem é consumida por um só consumidor.', when: 'Desacoplar quem pede de quem faz, absorver picos, tarefas lentas.', care: 'Defina o que acontece com mensagens que falham sempre (fila de mensagens mortas).' },
  eventos: { g: 'msg', abbr: 'EVT', label: 'Barramento de eventos', what: 'Publica fatos ("pedido criado") para vários interessados ouvirem (Kafka, SNS, EventBridge).', when: 'Vários sistemas reagindo ao mesmo acontecimento, sem o emissor conhecê-los.', care: 'O fluxo fica difícil de seguir. Documente quem publica e quem consome cada evento.' },
  push: { g: 'msg', abbr: 'PUSH', label: 'Notificações push', what: 'Serviço que entrega avisos no celular mesmo com o app fechado (FCM, APNs).', when: 'Avisar o entregador de uma corrida nova, o cliente de que o pedido saiu.', care: 'A entrega não é garantida nem imediata: use como aviso e faça o app confirmar o estado real na API.' },
  obs: { g: 'ops', abbr: 'OBS', label: 'Observabilidade', what: 'Logs, métricas, rastreamento e alertas que mostram como o sistema está.', when: 'Sempre. Sem isso você descobre os problemas pelo cliente.', care: 'Alerta demais é ignorado. Alerte sobre sintomas que o usuário sente.' },
  agendador: { g: 'ops', abbr: 'CRON', label: 'Agendador', what: 'Dispara tarefas em horários definidos.', when: 'Rotinas diárias, lembretes, limpezas, fechamentos.', care: 'Com várias instâncias, garanta que a tarefa rode uma vez só.' }
} satisfies Record<string, CatalogItem>;

export type ComponentKind = keyof typeof CATALOG;

export const groupOf = (kind: ComponentKind) => GROUPS.find(g => g.id === CATALOG[kind].g)!;

export const COMM_OPTIONS = [
  'HTTP/REST', 'gRPC', 'GraphQL', 'WebSocket', 'SQL', 'Leitura/escrita', 'Publica evento', 'Consome evento',
  'Envia para fila', 'Lê da fila', 'Upload/download', 'Webhook', 'Envia notificação', 'Anotação'
];

export const isAsyncLabel = (l: string) => /evento|fila|webhook/i.test(l || '');

export function guessLabel(from?: string, to?: string): string {
  if (!from || !to) return '';
  if (to === 'sql') return 'SQL';
  if (to === 'fila') return 'Envia para fila';
  if (from === 'fila') return 'Lê da fila';
  if (to === 'eventos') return 'Publica evento';
  if (from === 'eventos') return 'Consome evento';
  if (to === 'storage') return 'Upload/download';
  if (to === 'realtime' || from === 'realtime') return 'WebSocket';
  if (to === 'push') return 'Envia notificação';
  if (['cache', 'nosql', 'busca'].includes(to)) return 'Leitura/escrita';
  return 'HTTP/REST';
}

export const NOTE_COLORS: { id: string; label: string }[] = [
  { id: 'amarelo', label: 'Amarelo' },
  { id: 'verde', label: 'Verde' },
  { id: 'azul', label: 'Azul' },
  { id: 'rosa', label: 'Rosa' },
  { id: 'lilas', label: 'Lilás' },
  { id: 'cinza', label: 'Cinza' }
];
