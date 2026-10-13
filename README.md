# Mesa — Gestão de Buffet e Eventos

Painel para administrar clientes, eventos, orçamentos, contratos e pagamentos.

## Desenvolvimento

É necessário ter Node.js 22+ e uma instância PostgreSQL acessível.

```sh
npm ci
cp .env.example .env
npm run dev
```

No PowerShell, substitua o comando de cópia por:

```powershell
Copy-Item .env.example .env
```

Consulte [`docs/backend-model.md`](docs/backend-model.md) para preparar o banco e
aplicar as migrations em desenvolvimento.

## Docker

O `compose.yaml` inicia a aplicação e o PostgreSQL com healthchecks. Copie as
variáveis de exemplo antes de iniciar:

```sh
cp .env.example .env
docker compose up --build -d
docker compose ps
docker compose logs -f app
```

A aplicação fica disponível em `http://localhost:3000` por padrão. Use
`APP_PORT` e `POSTGRES_PORT` no `.env` para alterar as portas publicadas.

Para encerrar os serviços sem remover os dados:

```sh
docker compose down
```

Para também remover o volume persistente do PostgreSQL:

```sh
docker compose down --volumes
```

O container da aplicação **não aplica migrations automaticamente**. Se
necessário, faça o deploy explicitamente a partir do host (com Node.js e as
dependências instaladas), depois que o banco estiver saudável:

```sh
npm run db:deploy
```

Esse comando é uma operação administrativa separada e não faz parte do
`docker compose up`.

Depois de aplicar as migrations pela primeira vez, crie a empresa e o
administrador inicial explicitamente:

```sh
npm run db:seed
```

O seed exige `SEED_ADMIN_EMAIL` e uma `SEED_ADMIN_PASSWORD` com pelo menos 12
caracteres. Ele também não é executado automaticamente pelo container.

## Variáveis de ambiente

- `DATABASE_URL`: conexão usada ao executar a aplicação diretamente no host.
- `SESSION_SECRET`: chave aleatória de no mínimo 32 caracteres usada para assinar sessões.
- `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`: credenciais usadas somente por `npm run db:seed`.
- `APP_PORT`: porta HTTP publicada para a aplicação (padrão `3000`).
- `POSTGRES_PORT`: porta do PostgreSQL publicada no host (padrão `5432`).
- `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD`: banco e credenciais
  usados pelo Compose. Em ambientes compartilhados, substitua os valores de
  desenvolvimento e mantenha o `.env` fora do versionamento.
