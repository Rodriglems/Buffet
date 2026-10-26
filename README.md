# Mesa — Gestão de Buffet e Eventos

Painel para administrar clientes, eventos, cardápio, orçamentos, pagamentos e documentos
de um buffet, com formulário público de pedido de orçamento e portal do cliente.

## Desenvolvimento

É necessário ter Node.js 22+ e uma instância PostgreSQL acessível.

```sh
npm ci
cp .env.example .env
npm run db:deploy
npm run db:seed
npm run dev
```

No PowerShell, substitua o comando de cópia por `Copy-Item .env.example .env`.

Verificações usadas antes de publicar:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Documentação complementar:

- [`docs/producao.md`](docs/producao.md): implantação, variáveis, backup, reversão e checklist.
- [`docs/backend-model.md`](docs/backend-model.md): modelo de dados e regras do backend.
- [`docs/cloudflare-r2.md`](docs/cloudflare-r2.md): armazenamento das imagens no Cloudflare R2.

## Docker

O `compose.yaml` sobe três serviços: `db` (PostgreSQL 17), `migrate` (aplica as
migrations pendentes com `prisma migrate deploy` e termina) e `app` (o servidor, que só
inicia depois que as migrations terminam com sucesso).

```sh
cp .env.example .env
docker compose up --build -d
docker compose ps
docker compose logs -f app
```

A aplicação fica em `http://localhost:3000` por padrão. O PostgreSQL só aceita conexões
do próprio servidor (`127.0.0.1`).

Depois da primeira subida, crie a empresa e o administrador inicial a partir do host
(com Node.js e as dependências instaladas):

```sh
npm run db:seed
```

Para encerrar sem apagar os dados use `docker compose down`. **Nunca** use
`docker compose down --volumes` em produção: o volume guarda o banco de dados.

## Variáveis de ambiente

Todas estão documentadas em [`.env.example`](.env.example). As obrigatórias em produção:

- `DATABASE_URL` (fora do Docker) ou `POSTGRES_*` (com Docker Compose);
- `SESSION_SECRET`: chave aleatória com pelo menos 32 caracteres;
- `APP_URL`: endereço público do sistema, usado nos links enviados por e-mail;
- `SMTP_*` e `EMAIL_FROM`: envio de e-mails (recuperação de senha e avisos);
- `R2_*`: armazenamento das imagens do cardápio e da logo.
