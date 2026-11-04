export type Scenario = {
  id: string;
  name: string;
  custom?: boolean;
  context?: string;
  functional?: string[];
  quality?: [string, string][];
  constraints?: string[];
  twist?: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'encurtador', name: 'Encurtador de links',
    context: 'Um serviço que transforma URLs longas em links curtos para campanhas de marketing, e redireciona quem clica.',
    functional: ['Criar link curto a partir de uma URL longa', 'Redirecionar quem acessa o link curto', 'Contar cliques por link'],
    quality: [['50 milhões', 'de redirecionamentos por dia, com picos 5x maiores em campanhas'], ['< 50 ms', 'no redirecionamento (p95)'], ['zero', 'links perdidos depois de criados']],
    constraints: ['Time de 2 pessoas', 'Orçamento de infraestrutura baixo'],
    twist: 'O marketing quer um painel com cliques por país e por hora, atualizado em até 1 minuto, sem deixar o redirecionamento mais lento.'
  },
  {
    id: 'delivery', name: 'App de delivery',
    context: 'Plataforma que conecta clientes, restaurantes e entregadores de uma cidade média.',
    functional: ['Cliente monta o pedido e paga', 'Restaurante aceita e prepara', 'Entregador recebe a corrida', 'Cliente acompanha o status em tempo real'],
    quality: [['10x', 'mais pedidos no almoço e no jantar do que no resto do dia'], ['< 5 s', 'para o restaurante ver um pedido novo'], ['nenhum', 'pedido pago sem chegar ao restaurante']],
    constraints: ['Pagamento por gateway externo, que às vezes demora 30 s para confirmar', 'Entregadores com internet instável'],
    twist: 'Três marketplaces vão enviar pedidos para os mesmos restaurantes por webhook, cada um com formato próprio e podendo reenviar o mesmo pedido.'
  },
  {
    id: 'ingressos', name: 'Venda de ingressos',
    context: 'Venda online de ingressos com lugar marcado para shows grandes.',
    functional: ['Ver mapa de assentos', 'Reservar assento por 10 minutos', 'Pagar e emitir o ingresso', 'Liberar assento se o pagamento não ocorrer'],
    quality: [['200 mil', 'pessoas acessando no minuto de abertura'], ['0', 'assentos vendidos duas vezes'], ['< 2 s', 'para mostrar o mapa de assentos']],
    constraints: ['Fora das aberturas, o tráfego é quase zero', 'Pagamento externo'],
    twist: 'O produtor exige uma fila virtual: quem entrar primeiro compra primeiro, com posição na fila visível e sem perder o lugar ao recarregar a página.'
  },
  {
    id: 'clinica', name: 'Agenda de clínicas',
    context: 'Sistema de agendamento para uma rede de 40 clínicas, usado por pacientes e recepcionistas.',
    functional: ['Paciente agenda, remarca e cancela', 'Recepção vê a agenda do dia', 'Lembretes por WhatsApp e e-mail', 'Verificação de cobertura do convênio'],
    quality: [['LGPD', 'dados de saúde protegidos e acesso auditado'], ['99,9%', 'de disponibilidade em horário comercial'], ['24 h e 2 h', 'antes da consulta, envio dos lembretes']],
    constraints: ['APIs dos convênios são lentas (até 20 s) e caem com frequência', 'Recepcionistas usam computadores antigos'],
    twist: 'A rede quer lançar teleconsulta por vídeo, com gravação opcional mediante consentimento do paciente.'
  },
  { id: 'livre', name: 'Cenário livre', custom: true }
];

export const QUESTIONS = [
  { id: 'dono', q: 'Cada dado tem um único dono que escreve nele?' },
  { id: 'falha', q: 'Sei o que acontece quando cada componente cai?' },
  { id: 'pico', q: 'Está claro o que escala no pico e como?' },
  { id: 'async', q: 'O que não precisa de resposta imediata está assíncrono?' },
  { id: 'auth', q: 'Está claro como pessoas e serviços se autenticam?' },
  { id: 'obs', q: 'Eu descobriria um problema antes do cliente?' },
  { id: 'externo', q: 'Dependências externas têm timeout e plano B?' },
  { id: 'caro', q: 'Sei qual decisão seria mais cara de mudar depois?' }
];

export const scenarioById = (id: string) => SCENARIOS.find(s => s.id === id) ?? SCENARIOS[0];
