# Modelo de backend

O backend usa **PostgreSQL 14+ com Prisma ORM 7**. O modelo principal está em
[`prisma/schema.prisma`](../prisma/schema.prisma) e as migrations em
[`prisma/migrations`](../prisma/migrations).

## Decisões principais

- IDs são UUIDs.
- Datas de auditoria usam `timestamptz`; datas de evento e vencimento usam `date`; horários usam `time`.
- Valores monetários usam `numeric(14,2)`, nunca ponto flutuante.
- CNPJ, CPF e CEP são persistidos somente com dígitos. A formatação pertence à interface.
- Status e tipos fechados são enums do PostgreSQL, expostos como enums pelo Prisma Client.
- Relações que carregam `empresa_id` usam chaves estrangeiras compostas. Um registro não pode apontar para dados de outro buffet.
- Regras que o Prisma Schema não representa, como números positivos, ficam nas migrations como `check constraints` e triggers.
- Exclusões de registros comerciais são restritas. Itens de orçamento, opções de itens e notificações, que não têm vida independente, usam exclusão em cascata.

## Relacionamentos

```text
Empresa
|-- Usuários -- Notificações
|-- Leads
|-- Categorias do cardápio
|-- Serviços (itens do cardápio) -- Opções (ex.: recheios de uma massa)
|-- Clientes -- Eventos -- Custos
|                 |-- Orçamentos -- Itens -- Serviço (opcional)
|                 `-- Pagamentos (parcelas)
`-- Documentos (podem apontar para usuário, cliente e evento)
```

## Fluxo do evento

`Orçamento → Aprovado → Pagamento → Confirmado → Finalizado` (e `Cancelado` a qualquer
momento). Cada etapa só avança a partir da anterior; o servidor recusa ações fora de
ordem. O PDF do evento fica disponível a partir de `Confirmado`.

## Configuração local

Copie `.env.example` para `.env` e ajuste a `DATABASE_URL`. Com o PostgreSQL acessível:

```sh
npm run db:migrate      # desenvolvimento: cria/aplica migrations
npm run prisma:generate
```

Em produção, aplique só as migrations já versionadas (nunca cria nem apaga nada além
delas):

```sh
npm run db:deploy
```

O acesso ao banco no servidor é feito por `getPrisma()` em `src/lib/prisma.server.ts`.
O Client gerado fica em `src/generated/prisma` e não é versionado.

## Regras que ficam na aplicação

Executadas em transações do Prisma:

1. Calcular `valorTotal` de cada item e recalcular `subtotal`, `desconto` e `total` do orçamento.
2. Ao aprovar um orçamento, mover o evento para `Aprovado`.
3. Ao lançar parcelas, mover o evento para `Pagamento`; com todas pagas, para `Confirmado`.
4. Marcar pagamentos pendentes como atrasados após o vencimento.
5. Salvar apenas URL e metadados de imagens e documentos no banco; os arquivos ficam no Cloudflare R2.

## Segurança e autenticação

- Senhas são armazenadas apenas como hash `scrypt` com salt por usuário (`src/lib/password.server.ts`).
- A sessão é um cookie `httpOnly`, assinado com HMAC (`SESSION_SECRET`), `secure` em produção.
- Toda consulta autenticada usa a `empresaId` da sessão no servidor; clientes só enxergam os próprios dados.
- O login bloqueia a conta por 15 minutos após 5 senhas erradas, e as ações públicas têm limite de tentativas por IP.
- Credenciais e a `DATABASE_URL` nunca são expostas ao frontend.
