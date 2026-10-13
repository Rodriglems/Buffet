# Modelo de backend

O backend usa **PostgreSQL 14+ com Prisma ORM 7.10**. O modelo principal está em [`prisma/schema.prisma`](../prisma/schema.prisma) e a primeira migration está em [`prisma/migrations/20261009000000_init/migration.sql`](../prisma/migrations/20261009000000_init/migration.sql).

## Decisões principais

- IDs são UUIDs.
- Datas de auditoria usam `timestamptz`; datas de evento e vencimento usam `date`; horários usam `time`.
- Valores monetários usam `numeric(14,2)`, nunca ponto flutuante.
- CNPJ, CPF e CEP são persistidos somente com dígitos. A formatação pertence à interface.
- Status e tipos fechados são enums do PostgreSQL, expostos como enums pelo Prisma Client.
- Relações que carregam `empresa_id` usam chaves estrangeiras compostas. Um registro não pode apontar para dados de outro buffet.
- Regras que o Prisma Schema não representa, como números positivos e consistência de totais, ficam documentadas na migration como `check constraints` e triggers.
- Exclusões de registros comerciais são restritas. Itens de orçamento, assinaturas e notificações, que não têm vida independente, usam exclusão em cascata.

## Relacionamentos

```text
Empresa
|-- Usuários -- Notificações
|-- Leads
|-- Clientes -- Eventos -- Custos
|                 |-- Orçamentos -- Itens -- Serviço (opcional)
|                 `-- Contratos -- Pagamentos
|                                `-- Assinaturas
|-- Serviços
|-- Atividades
`-- Documentos (podem apontar para usuário, cliente, evento e contrato)
```

## Configuração local

Copie `.env.example` para `.env` e ajuste a URL usada pelos comandos executados
no host:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/buffet?schema=public"
```

Com o PostgreSQL acessível, use:

```sh
npm run db:migrate
npm run prisma:generate
```

Em produção, aplique migrations já versionadas sem tentar criar uma nova:

```sh
npm run db:deploy
```

O acesso ao banco no servidor deve ser obtido por `getPrisma()` em `src/lib/prisma.server.ts`. O Client gerado fica em `src/generated/prisma` e não é versionado.

## PostgreSQL com Docker Compose

O `compose.yaml` fornece dois serviços:

- `db`, baseado em PostgreSQL 17, com healthcheck e dados persistidos no volume
  nomeado `postgres_data`;
- `app`, que aguarda o healthcheck do banco e executa o servidor Nitro na porta
  interna `3000`.

Variáveis aceitas pelo Compose:

- `APP_PORT` e `POSTGRES_PORT`: portas publicadas no host;
- `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD`: criação e acesso ao
  banco.

Dentro da rede do Compose, a aplicação recebe uma `DATABASE_URL` construída com
essas credenciais e usa `db` como hostname. A `DATABASE_URL` do `.env` continua
apontando para `localhost`, para comandos Prisma executados no host.

```sh
docker compose up --build -d
docker compose ps
docker compose logs -f app
```

O startup da aplicação executa somente `.output/server/index.mjs`: ele não
roda `prisma migrate deploy`, `prisma migrate dev` nem qualquer outra alteração
de schema. Quando necessário, aplique migrations conscientemente a partir do
host:

```sh
npm ci
npm run db:deploy
```

Finalize os containers com `docker compose down`. Os dados permanecem no
volume; use `docker compose down --volumes` apenas quando quiser removê-los.

## Regras que ficam na aplicação

As seguintes operações devem acontecer em transações do Prisma:

1. Calcular `valorTotal` de cada item e recalcular `subtotal`, `desconto` e `total` do orçamento.
2. Ao aprovar um orçamento, criar o contrato a partir de um retrato imutável daquela versão.
3. Ao registrar um pagamento, atualizar o status e gerar atividade/notificação.
4. Marcar pagamentos pendentes como atrasados após o vencimento por tarefa agendada.
5. Converter lead em cliente sem apagar o lead; seu status passa a `CONVERTIDO`.
6. Salvar apenas URL e metadados dos documentos no banco; arquivos ficam em storage privado.

## Recursos operacionais preparados

- Eventos podem ser exportados como arquivos `.ics`, compatíveis com Google Calendar,
  Outlook e Apple Calendar.
- Orçamentos e contratos possuem layout de impressão para salvar em PDF pelo navegador.
- O contato do evento pode ser aberto no WhatsApp sem armazenar credenciais de terceiros.
- A atualização manual de lembretes marca parcelas vencidas e gera resumos diários para
  administradores, sem duplicar notificações no mesmo dia. Essa função pode ser chamada
  futuramente por um agendador externo.

## Segurança e autenticação

`senhaHash` deve receber somente hashes produzidos por Argon2id ou bcrypt, nunca senha em texto. Toda consulta autenticada deve usar a `empresaId` da sessão no servidor. Credenciais e a `DATABASE_URL` nunca devem ser expostas ao frontend.

A interface ainda consome `src/data/mock.ts`. A migração para dados reais deve ser feita por domínio, após definir autenticação e disponibilizar uma instância PostgreSQL.
