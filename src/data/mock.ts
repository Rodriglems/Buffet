/**
 * Camada de dados mockados.
 * Toda a UI consome estes objetos. Ao conectar uma API REST, basta trocar
 * estas funções por chamadas HTTP mantendo os mesmos tipos.
 */

export type StatusEvento =
  | "Planejamento"
  | "Orçamento"
  | "Negociação"
  | "Aprovado"
  | "Contrato"
  | "Assinado"
  | "Confirmado"
  | "Realizado"
  | "Finalizado"
  | "Cancelado";

export type StatusOrcamento =
  | "Rascunho"
  | "Enviado"
  | "Visualizado"
  | "Em negociação"
  | "Aguardando aprovação"
  | "Aprovado"
  | "Rejeitado"
  | "Expirado"
  | "Cancelado";

export type StatusContrato =
  | "Rascunho"
  | "Enviado"
  | "Aguardando assinatura"
  | "Assinado"
  | "Cancelado";

export type StatusPagamento = "Pendente" | "Pago" | "Atrasado" | "Cancelado";

export interface Cliente {
  id: string;
  nome: string;
  documento: string;
  telefone: string;
  whatsapp: string;
  email: string;
  nascimento: string;
  status: "Ativo" | "Inativo";
  origem: string;
  cadastro: string;
  observacoes: string;
  endereco: {
    cep: string;
    estado: string;
    cidade: string;
    bairro: string;
    rua: string;
    numero: string;
    complemento: string;
  };
  qtdEventos: number;
  ultimoEvento: string;
}

export interface ItemOrcamento {
  id: string;
  servico: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  desconto: number;
}

export interface Orcamento {
  id: string;
  codigo: string;
  clienteId: string;
  eventoId: string;
  data: string;
  validade: string;
  versao: number;
  status: StatusOrcamento;
  itens: ItemOrcamento[];
  desconto: number;
  observacoes: string;
  condicoes: string;
}

export interface VersaoNegociacao {
  versao: number;
  data: string;
  valor: number;
  alteracoes: string;
  responsavel: string;
  status: string;
}

export interface Contrato {
  id: string;
  codigo: string;
  clienteId: string;
  eventoId: string;
  data: string;
  valor: number;
  status: StatusContrato;
  assinadoEm: string | null;
  assinadoHora: string | null;
}

export interface Parcela {
  id: string;
  clienteId: string;
  eventoId: string;
  parcela: string;
  vencimento: string;
  valor: number;
  status: StatusPagamento;
}

export interface Custo {
  id: string;
  eventoId: string;
  categoria:
    | "Alimentos"
    | "Bebidas"
    | "Equipe"
    | "Transporte"
    | "Decoração"
    | "Estrutura"
    | "Outros";
  descricao: string;
  fornecedor: string;
  data: string;
  valor: number;
  observacao: string;
}

export interface Evento {
  id: string;
  nome: string;
  tipo: "Casamento" | "Aniversário" | "Formatura" | "Corporativo" | "Confraternização";
  clienteId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  convidados: number;
  local: string;
  endereco: string;
  valor: number;
  status: StatusEvento;
  observacoes: string;
}

export interface Atividade {
  id: string;
  descricao: string;
  usuario: string;
  data: string;
  hora: string;
  tipo: "Orçamento" | "Contrato" | "Pagamento" | "Evento" | "Cliente";
  clienteId?: string;
  eventoId?: string;
}

export interface Notificacao {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
  lida: boolean;
  tipo: "Orçamento" | "Contrato" | "Pagamento" | "Evento";
}

export const empresa = {
  nome: "Mesa Buffet & Eventos",
  cnpj: "18.402.556/0001-73",
  telefone: "(11) 4002-8922",
  email: "contato@mesabuffet.com.br",
  endereco: "Rua das Oliveiras, 340 — Pinheiros, São Paulo/SP",
};

export const usuarioAdmin = {
  nome: "Marina Costa",
  cargo: "Administradora",
  email: "marina@mesabuffet.com.br",
  iniciais: "MC",
};

export const clientes: Cliente[] = [
  {
    id: "c1",
    nome: "João da Silva",
    documento: "312.884.190-55",
    telefone: "(11) 98812-4410",
    whatsapp: "(11) 98812-4410",
    email: "joao.silva@email.com",
    nascimento: "1984-03-12",
    status: "Ativo",
    origem: "Indicação",
    cadastro: "2024-11-02",
    observacoes: "Prefere contato por WhatsApp no período da noite.",
    endereco: {
      cep: "05422-030",
      estado: "SP",
      cidade: "São Paulo",
      bairro: "Pinheiros",
      rua: "Rua Artur de Azevedo",
      numero: "1120",
      complemento: "Apto 84",
    },
    qtdEventos: 3,
    ultimoEvento: "2026-06-15",
  },
  {
    id: "c2",
    nome: "Maria Oliveira",
    documento: "908.221.470-08",
    telefone: "(11) 99134-7720",
    whatsapp: "(11) 99134-7720",
    email: "maria.oliveira@email.com",
    nascimento: "1991-08-27",
    status: "Ativo",
    origem: "Instagram",
    cadastro: "2025-02-18",
    observacoes: "Restrição alimentar: cardápio sem lactose para 12 convidados.",
    endereco: {
      cep: "04533-012",
      estado: "SP",
      cidade: "São Paulo",
      bairro: "Itaim Bibi",
      rua: "Rua Jerônimo da Veiga",
      numero: "76",
      complemento: "",
    },
    qtdEventos: 2,
    ultimoEvento: "2026-05-24",
  },
  {
    id: "c3",
    nome: "Carlos Santos",
    documento: "455.109.330-21",
    telefone: "(11) 97741-1093",
    whatsapp: "(11) 97741-1093",
    email: "carlos.santos@email.com",
    nascimento: "1978-01-09",
    status: "Ativo",
    origem: "Site",
    cadastro: "2025-05-04",
    observacoes: "",
    endereco: {
      cep: "09080-500",
      estado: "SP",
      cidade: "Santo André",
      bairro: "Vila Assunção",
      rua: "Avenida Portugal",
      numero: "455",
      complemento: "Casa 2",
    },
    qtdEventos: 1,
    ultimoEvento: "2026-06-09",
  },
  {
    id: "c4",
    nome: "TechNova Sistemas LTDA",
    documento: "22.310.788/0001-04",
    telefone: "(11) 3255-9080",
    whatsapp: "(11) 99870-1122",
    email: "eventos@technova.com.br",
    nascimento: "2016-04-22",
    status: "Ativo",
    origem: "Prospecção ativa",
    cadastro: "2025-08-11",
    observacoes: "Emissão de nota fiscal obrigatória em até 48h após o evento.",
    endereco: {
      cep: "04571-010",
      estado: "SP",
      cidade: "São Paulo",
      bairro: "Brooklin",
      rua: "Rua Flórida",
      numero: "1980",
      complemento: "12º andar",
    },
    qtdEventos: 4,
    ultimoEvento: "2026-06-02",
  },
  {
    id: "c5",
    nome: "Beatriz Duarte",
    documento: "701.552.884-19",
    telefone: "(11) 98220-6644",
    whatsapp: "(11) 98220-6644",
    email: "bia.duarte@email.com",
    nascimento: "1995-11-30",
    status: "Inativo",
    origem: "Feira de noivas",
    cadastro: "2025-09-27",
    observacoes: "",
    endereco: {
      cep: "01310-200",
      estado: "SP",
      cidade: "São Paulo",
      bairro: "Bela Vista",
      rua: "Avenida Paulista",
      numero: "900",
      complemento: "Conj. 51",
    },
    qtdEventos: 1,
    ultimoEvento: "2026-06-15",
  },
];

export const eventos: Evento[] = [
  {
    id: "e1",
    nome: "Casamento Ferreira",
    tipo: "Casamento",
    clienteId: "c1",
    data: "2026-10-18",
    horaInicio: "18:00",
    horaFim: "02:00",
    convidados: 180,
    local: "Espaço Villa Bosque",
    endereco: "Estrada do Carmo, 2100 — Cotia/SP",
    valor: 42000,
    status: "Contrato",
    observacoes: "Cerimônia ao ar livre com plano B coberto em caso de chuva.",
  },
  {
    id: "e2",
    nome: "Aniversário 40 anos — Maria",
    tipo: "Aniversário",
    clienteId: "c2",
    data: "2026-10-24",
    horaInicio: "20:00",
    horaFim: "01:00",
    convidados: 90,
    local: "Casa de Vidro",
    endereco: "Rua Harmonia, 410 — Vila Madalena, São Paulo/SP",
    valor: 18500,
    status: "Aprovado",
    observacoes: "Bolo fornecido pela cliente.",
  },
  {
    id: "e3",
    nome: "Convenção TechNova 2026",
    tipo: "Corporativo",
    clienteId: "c4",
    data: "2026-11-02",
    horaInicio: "09:00",
    horaFim: "18:00",
    convidados: 320,
    local: "Centro de Convenções Frei Caneca",
    endereco: "Rua Frei Caneca, 569 — São Paulo/SP",
    valor: 88000,
    status: "Negociação",
    observacoes: "Coffee break em três turnos e almoço servido em buffet.",
  },
  {
    id: "e4",
    nome: "Formatura Colégio Aurora",
    tipo: "Formatura",
    clienteId: "c3",
    data: "2026-11-09",
    horaInicio: "19:30",
    horaFim: "03:00",
    convidados: 240,
    local: "Terrace Rooftop",
    endereco: "Avenida Brigadeiro Faria Lima, 3400 — São Paulo/SP",
    valor: 56000,
    status: "Orçamento",
    observacoes: "",
  },
  {
    id: "e5",
    nome: "Casamento Duarte",
    tipo: "Casamento",
    clienteId: "c5",
    data: "2026-11-15",
    horaInicio: "17:00",
    horaFim: "01:00",
    convidados: 150,
    local: "Jardim das Flores",
    endereco: "Rodovia Raposo Tavares, km 32 — Cotia/SP",
    valor: 38000,
    status: "Assinado",
    observacoes: "Cliente solicitou estação de doces finos.",
  },
  {
    id: "e6",
    nome: "Confraternização TechNova",
    tipo: "Confraternização",
    clienteId: "c4",
    data: "2026-12-12",
    horaInicio: "19:00",
    horaFim: "23:30",
    convidados: 120,
    local: "Rooftop TechNova",
    endereco: "Rua Flórida, 1980 — São Paulo/SP",
    valor: 27500,
    status: "Planejamento",
    observacoes: "",
  },
  {
    id: "e7",
    nome: "Casamento Silva — renovação de votos",
    tipo: "Casamento",
    clienteId: "c1",
    data: "2026-08-22",
    horaInicio: "18:30",
    horaFim: "00:00",
    convidados: 70,
    local: "Sítio Vale Verde",
    endereco: "Estrada do Vale, 78 — Ibiúna/SP",
    valor: 21000,
    status: "Finalizado",
    observacoes: "",
  },
];

export const orcamentos: Orcamento[] = [
  {
    id: "o1",
    codigo: "ORC-001",
    clienteId: "c1",
    eventoId: "e1",
    data: "2026-08-14",
    validade: "2026-09-14",
    versao: 3,
    status: "Aprovado",
    desconto: 1500,
    observacoes: "Valor inclui equipe de garçons e maîtres.",
    condicoes: "30% de entrada na assinatura, saldo em 3 parcelas até 10 dias antes do evento.",
    itens: [
      {
        id: "i1",
        servico: "Jantar completo",
        descricao: "Entrada, prato principal e sobremesa",
        quantidade: 180,
        unidade: "pessoa",
        valorUnitario: 165,
        desconto: 0,
      },
      {
        id: "i2",
        servico: "Open bar premium",
        descricao: "Destilados, vinhos e coquetelaria",
        quantidade: 180,
        unidade: "pessoa",
        valorUnitario: 58,
        desconto: 0,
      },
      {
        id: "i3",
        servico: "Equipe de serviço",
        descricao: "18 garçons, 2 maîtres e 1 coordenador",
        quantidade: 21,
        unidade: "profissional",
        valorUnitario: 180,
        desconto: 0,
      },
    ],
  },
  {
    id: "o2",
    codigo: "ORC-002",
    clienteId: "c2",
    eventoId: "e2",
    data: "2026-09-01",
    validade: "2026-10-01",
    versao: 1,
    status: "Aguardando aprovação",
    desconto: 500,
    observacoes: "Cardápio sem lactose para 12 convidados já contemplado.",
    condicoes: "50% na aprovação e 50% até 5 dias antes do evento.",
    itens: [
      {
        id: "i4",
        servico: "Coquetel volante",
        descricao: "12 tipos de canapés e finger food",
        quantidade: 90,
        unidade: "pessoa",
        valorUnitario: 128,
        desconto: 0,
      },
      {
        id: "i5",
        servico: "Bar de drinks",
        descricao: "4 drinks autorais + não alcoólicos",
        quantidade: 90,
        unidade: "pessoa",
        valorUnitario: 46,
        desconto: 0,
      },
      {
        id: "i6",
        servico: "Estrutura e louças",
        descricao: "Mobiliário, louças e cristais",
        quantidade: 1,
        unidade: "serviço",
        valorUnitario: 3200,
        desconto: 0,
      },
    ],
  },
  {
    id: "o3",
    codigo: "ORC-003",
    clienteId: "c4",
    eventoId: "e3",
    data: "2026-09-08",
    validade: "2026-10-08",
    versao: 2,
    status: "Em negociação",
    desconto: 4000,
    observacoes: "Aguardando confirmação do número final de participantes.",
    condicoes: "Faturamento em 28 dias após a realização mediante nota fiscal.",
    itens: [
      {
        id: "i7",
        servico: "Coffee break",
        descricao: "3 turnos por dia de evento",
        quantidade: 320,
        unidade: "pessoa",
        valorUnitario: 78,
        desconto: 0,
      },
      {
        id: "i8",
        servico: "Almoço executivo",
        descricao: "Buffet quente com 2 proteínas",
        quantidade: 320,
        unidade: "pessoa",
        valorUnitario: 142,
        desconto: 0,
      },
      {
        id: "i9",
        servico: "Operação e logística",
        descricao: "Montagem, equipe e transporte",
        quantidade: 1,
        unidade: "serviço",
        valorUnitario: 18600,
        desconto: 0,
      },
    ],
  },
  {
    id: "o4",
    codigo: "ORC-004",
    clienteId: "c3",
    eventoId: "e4",
    data: "2026-09-15",
    validade: "2026-10-15",
    versao: 1,
    status: "Enviado",
    desconto: 0,
    observacoes: "",
    condicoes: "Parcelamento em até 6 vezes sem juros.",
    itens: [
      {
        id: "i10",
        servico: "Jantar de formatura",
        descricao: "Buffet completo com estação de massas",
        quantidade: 240,
        unidade: "pessoa",
        valorUnitario: 158,
        desconto: 0,
      },
      {
        id: "i11",
        servico: "Open bar",
        descricao: "Cerveja, vinho e drinks clássicos",
        quantidade: 240,
        unidade: "pessoa",
        valorUnitario: 52,
        desconto: 0,
      },
    ],
  },
  {
    id: "o5",
    codigo: "ORC-005",
    clienteId: "c5",
    eventoId: "e5",
    data: "2026-07-30",
    validade: "2026-08-30",
    versao: 2,
    status: "Aprovado",
    desconto: 2000,
    observacoes: "Estação de doces finos inclusa.",
    condicoes: "Entrada de 40% e saldo em 2 parcelas.",
    itens: [
      {
        id: "i12",
        servico: "Jantar completo",
        descricao: "Menu degustação em 4 tempos",
        quantidade: 150,
        unidade: "pessoa",
        valorUnitario: 186,
        desconto: 0,
      },
      {
        id: "i13",
        servico: "Estação de doces finos",
        descricao: "8 variedades artesanais",
        quantidade: 150,
        unidade: "pessoa",
        valorUnitario: 38,
        desconto: 0,
      },
      {
        id: "i14",
        servico: "Equipe de serviço",
        descricao: "16 garçons e 2 maîtres",
        quantidade: 18,
        unidade: "profissional",
        valorUnitario: 180,
        desconto: 0,
      },
    ],
  },
  {
    id: "o6",
    codigo: "ORC-006",
    clienteId: "c4",
    eventoId: "e6",
    data: "2026-09-20",
    validade: "2026-10-20",
    versao: 1,
    status: "Rascunho",
    desconto: 0,
    observacoes: "",
    condicoes: "",
    itens: [
      {
        id: "i15",
        servico: "Coquetel de confraternização",
        descricao: "Finger food e bar completo",
        quantidade: 120,
        unidade: "pessoa",
        valorUnitario: 190,
        desconto: 0,
      },
    ],
  },
];

export const versoesNegociacao: Record<string, VersaoNegociacao[]> = {
  o1: [
    {
      versao: 1,
      data: "2026-08-14",
      valor: 45200,
      alteracoes: "Proposta inicial com jantar completo e open bar premium.",
      responsavel: "Marina Costa",
      status: "Enviado",
    },
    {
      versao: 2,
      data: "2026-08-21",
      valor: 43600,
      alteracoes: "Cliente solicitou redução da estação de queijos e ajuste no open bar.",
      responsavel: "Marina Costa",
      status: "Em negociação",
    },
    {
      versao: 3,
      data: "2026-08-28",
      valor: 42000,
      alteracoes: "Desconto comercial de R$ 1.500 aplicado. Proposta aprovada pelo cliente.",
      responsavel: "Marina Costa",
      status: "Aprovado",
    },
  ],
  o3: [
    {
      versao: 1,
      data: "2026-09-08",
      valor: 92000,
      alteracoes: "Proposta inicial para 340 participantes.",
      responsavel: "Rafael Nunes",
      status: "Enviado",
    },
    {
      versao: 2,
      data: "2026-09-18",
      valor: 88000,
      alteracoes: "Ajuste para 320 participantes e revisão do coffee break.",
      responsavel: "Rafael Nunes",
      status: "Em negociação",
    },
  ],
};

export const contratos: Contrato[] = [
  {
    id: "ct1",
    codigo: "CTR-001",
    clienteId: "c1",
    eventoId: "e1",
    data: "2026-09-02",
    valor: 42000,
    status: "Assinado",
    assinadoEm: "2026-09-04",
    assinadoHora: "14:32",
  },
  {
    id: "ct2",
    codigo: "CTR-002",
    clienteId: "c5",
    eventoId: "e5",
    data: "2026-08-12",
    valor: 38000,
    status: "Assinado",
    assinadoEm: "2026-08-13",
    assinadoHora: "09:15",
  },
  {
    id: "ct3",
    codigo: "CTR-003",
    clienteId: "c2",
    eventoId: "e2",
    data: "2026-09-22",
    valor: 18500,
    status: "Aguardando assinatura",
    assinadoEm: null,
    assinadoHora: null,
  },
  {
    id: "ct4",
    codigo: "CTR-004",
    clienteId: "c4",
    eventoId: "e3",
    data: "2026-09-24",
    valor: 88000,
    status: "Rascunho",
    assinadoEm: null,
    assinadoHora: null,
  },
];

export const parcelas: Parcela[] = [
  { id: "p1", clienteId: "c1", eventoId: "e1", parcela: "1/4", vencimento: "2026-09-10", valor: 12600, status: "Pago" },
  { id: "p2", clienteId: "c1", eventoId: "e1", parcela: "2/4", vencimento: "2026-09-25", valor: 9800, status: "Pago" },
  { id: "p3", clienteId: "c1", eventoId: "e1", parcela: "3/4", vencimento: "2026-10-08", valor: 9800, status: "Pendente" },
  { id: "p4", clienteId: "c1", eventoId: "e1", parcela: "4/4", vencimento: "2026-10-16", valor: 9800, status: "Pendente" },
  { id: "p5", clienteId: "c5", eventoId: "e5", parcela: "1/3", vencimento: "2026-08-20", valor: 15200, status: "Pago" },
  { id: "p6", clienteId: "c5", eventoId: "e5", parcela: "2/3", vencimento: "2026-09-20", valor: 11400, status: "Atrasado" },
  { id: "p7", clienteId: "c5", eventoId: "e5", parcela: "3/3", vencimento: "2026-11-05", valor: 11400, status: "Pendente" },
  { id: "p8", clienteId: "c2", eventoId: "e2", parcela: "1/2", vencimento: "2026-10-01", valor: 9250, status: "Pago" },
  { id: "p9", clienteId: "c2", eventoId: "e2", parcela: "2/2", vencimento: "2026-10-19", valor: 9250, status: "Pendente" },
  { id: "p10", clienteId: "c4", eventoId: "e3", parcela: "1/1", vencimento: "2026-11-30", valor: 88000, status: "Pendente" },
];

export const custos: Custo[] = [
  { id: "cu1", eventoId: "e1", categoria: "Alimentos", descricao: "Insumos do jantar", fornecedor: "Distribuidora Vale", data: "2026-10-10", valor: 12800, observacao: "" },
  { id: "cu2", eventoId: "e1", categoria: "Bebidas", descricao: "Open bar premium", fornecedor: "Adega Central", data: "2026-10-11", valor: 6400, observacao: "" },
  { id: "cu3", eventoId: "e1", categoria: "Equipe", descricao: "21 profissionais", fornecedor: "Equipe própria", data: "2026-10-18", valor: 4200, observacao: "" },
  { id: "cu4", eventoId: "e1", categoria: "Transporte", descricao: "Logística Cotia", fornecedor: "TransLog", data: "2026-10-18", valor: 1500, observacao: "" },
  { id: "cu5", eventoId: "e3", categoria: "Alimentos", descricao: "Coffee break e almoço", fornecedor: "Distribuidora Vale", data: "2026-10-28", valor: 24600, observacao: "3 dias de operação" },
  { id: "cu6", eventoId: "e3", categoria: "Estrutura", descricao: "Montagem e mobiliário", fornecedor: "Estrutura SP", data: "2026-10-30", valor: 6800, observacao: "" },
  { id: "cu7", eventoId: "e5", categoria: "Alimentos", descricao: "Menu degustação", fornecedor: "Casa do Chef", data: "2026-11-08", valor: 13400, observacao: "" },
  { id: "cu8", eventoId: "e5", categoria: "Decoração", descricao: "Arranjos e iluminação", fornecedor: "Flor & Luz", data: "2026-11-10", valor: 5200, observacao: "" },
  { id: "cu9", eventoId: "e2", categoria: "Alimentos", descricao: "Canapés e finger food", fornecedor: "Casa do Chef", data: "2026-10-20", valor: 5800, observacao: "" },
  { id: "cu10", eventoId: "e2", categoria: "Outros", descricao: "Seguro do evento", fornecedor: "Segura Mais", data: "2026-10-21", valor: 900, observacao: "" },
];

export const atividades: Atividade[] = [
  { id: "a1", descricao: "Contrato CTR-002 foi assinado pelo cliente.", usuario: "Beatriz Duarte", data: "2026-09-25", hora: "16:40", tipo: "Contrato", clienteId: "c5", eventoId: "e5" },
  { id: "a2", descricao: "Orçamento ORC-004 enviado ao cliente.", usuario: "Marina Costa", data: "2026-09-25", hora: "14:05", tipo: "Orçamento", clienteId: "c3", eventoId: "e4" },
  { id: "a3", descricao: "Pagamento da parcela 1/2 recebido — R$ 9.250,00.", usuario: "Sistema", data: "2026-09-25", hora: "10:22", tipo: "Pagamento", clienteId: "c2", eventoId: "e2" },
  { id: "a4", descricao: "Custo de insumos atualizado para a Convenção TechNova.", usuario: "Rafael Nunes", data: "2026-09-24", hora: "18:12", tipo: "Evento", clienteId: "c4", eventoId: "e3" },
  { id: "a5", descricao: "Valor do orçamento ORC-003 alterado de R$ 92.000,00 para R$ 88.000,00.", usuario: "Rafael Nunes", data: "2026-09-18", hora: "11:47", tipo: "Orçamento", clienteId: "c4", eventoId: "e3" },
  { id: "a6", descricao: "Cliente solicitou alteração no orçamento ORC-003.", usuario: "TechNova Sistemas", data: "2026-09-16", hora: "09:30", tipo: "Orçamento", clienteId: "c4", eventoId: "e3" },
  { id: "a7", descricao: "Contrato CTR-003 enviado para assinatura.", usuario: "Marina Costa", data: "2026-09-22", hora: "15:18", tipo: "Contrato", clienteId: "c2", eventoId: "e2" },
  { id: "a8", descricao: "Novo cliente cadastrado no sistema.", usuario: "Marina Costa", data: "2026-08-11", hora: "08:55", tipo: "Cliente", clienteId: "c4" },
  { id: "a9", descricao: "Orçamento ORC-001 aprovado pelo cliente.", usuario: "João da Silva", data: "2026-08-29", hora: "20:03", tipo: "Orçamento", clienteId: "c1", eventoId: "e1" },
  { id: "a10", descricao: "Contrato CTR-001 gerado a partir do orçamento ORC-001.", usuario: "Marina Costa", data: "2026-09-02", hora: "09:10", tipo: "Contrato", clienteId: "c1", eventoId: "e1" },
];

export const notificacoes: Notificacao[] = [
  { id: "n1", titulo: "Contrato assinado", descricao: "Beatriz Duarte assinou o contrato CTR-002.", data: "2026-09-25", hora: "16:40", lida: false, tipo: "Contrato" },
  { id: "n2", titulo: "Pagamento recebido", descricao: "Parcela 1/2 do Aniversário 40 anos — R$ 9.250,00.", data: "2026-09-25", hora: "10:22", lida: false, tipo: "Pagamento" },
  { id: "n3", titulo: "Pagamento atrasado", descricao: "Parcela 2/3 do Casamento Duarte venceu em 20/09/2026.", data: "2026-09-21", hora: "07:00", lida: false, tipo: "Pagamento" },
  { id: "n4", titulo: "Cliente solicitou alteração", descricao: "TechNova pediu revisão do orçamento ORC-003.", data: "2026-09-16", hora: "09:30", lida: true, tipo: "Orçamento" },
  { id: "n5", titulo: "Evento próximo", descricao: "Casamento Ferreira acontece em 18/10/2026.", data: "2026-09-15", hora: "08:00", lida: true, tipo: "Evento" },
];

export const receitaMensal = [
  { mes: "Mar", receita: 58000, custos: 26400 },
  { mes: "Abr", receita: 64200, custos: 29100 },
  { mes: "Mai", receita: 52800, custos: 24300 },
  { mes: "Jun", receita: 78500, custos: 33800 },
  { mes: "Jul", receita: 69400, custos: 30200 },
  { mes: "Ago", receita: 86300, custos: 37500 },
  { mes: "Set", receita: 74900, custos: 32600 },
  { mes: "Out", receita: 98400, custos: 41200 },
];

export const eventosPorMes = [
  { mes: "Mar", eventos: 4 },
  { mes: "Abr", eventos: 5 },
  { mes: "Mai", eventos: 3 },
  { mes: "Jun", eventos: 7 },
  { mes: "Jul", eventos: 6 },
  { mes: "Ago", eventos: 8 },
  { mes: "Set", eventos: 6 },
  { mes: "Out", eventos: 9 },
];

export const funil = [
  { etapa: "Lead", total: 14, largura: 100 },
  { etapa: "Orçamento", total: 11, largura: 80 },
  { etapa: "Negociação", total: 8, largura: 60 },
  { etapa: "Aprovado", total: 5, largura: 42 },
  { etapa: "Contrato", total: 4, largura: 33 },
  { etapa: "Assinado", total: 3, largura: 25 },
  { etapa: "Realizado", total: 2, largura: 18 },
];

/* ---------- Seletores auxiliares ---------- */

export const clienteById = (id: string) => clientes.find((c) => c.id === id);
export const eventoById = (id: string) => eventos.find((e) => e.id === id);
export const orcamentoById = (id: string) => orcamentos.find((o) => o.id === id);
export const contratoById = (id: string) => contratos.find((c) => c.id === id);

export const nomeCliente = (id: string) => clienteById(id)?.nome ?? "—";
export const nomeEvento = (id: string) => eventoById(id)?.nome ?? "—";

export function totalOrcamento(o: Orcamento) {
  const subtotal = o.itens.reduce(
    (acc, i) => acc + i.quantidade * i.valorUnitario - i.desconto,
    0,
  );
  return { subtotal, desconto: o.desconto, total: subtotal - o.desconto };
}

export function custosDoEvento(eventoId: string) {
  return custos.filter((c) => c.eventoId === eventoId);
}

export function totalCustosEvento(eventoId: string) {
  return custosDoEvento(eventoId).reduce((acc, c) => acc + c.valor, 0);
}

export function parcelasDoEvento(eventoId: string) {
  return parcelas.filter((p) => p.eventoId === eventoId);
}

export function atividadesDoEvento(eventoId: string) {
  return atividades.filter((a) => a.eventoId === eventoId);
}

export function atividadesDoCliente(clienteId: string) {
  return atividades.filter((a) => a.clienteId === clienteId);
}

/** Cliente demonstrativo do portal (área /cliente). */
export const clienteLogado = clientes[0];
