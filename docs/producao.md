# Produção: implantação, backup e reversão

## 1. Antes da primeira publicação

1. **Troque todos os segredos usados em desenvolvimento.** Gere um `SESSION_SECRET` novo
   (por exemplo `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`),
   crie um token novo no Cloudflare R2 e revogue o antigo, e use senhas novas para o banco
   e para o administrador.
2. Preencha o `.env` do servidor a partir do [`.env.example`](../.env.example). Obrigatórias:
   `SESSION_SECRET`, `APP_URL` (endereço público, com `https://`), `POSTGRES_PASSWORD`
   (ou `DATABASE_URL`), `SMTP_*`, `EMAIL_FROM` e `R2_*`.
3. Publique atrás de HTTPS (Nginx, Caddy, Cloudflare ou o proxy da hospedagem). O sistema
   envia `Strict-Transport-Security` em produção, então ele **precisa** ser servido por HTTPS.
4. Com um proxy na frente, defina `TRUST_PROXY=true` para o limite de tentativas usar o IP
   real do visitante. Sem proxy, mantenha `false`.

## 2. Implantação com Docker Compose

```sh
docker compose up --build -d   # db → migrate (aplica migrations) → app
docker compose ps              # app deve ficar "healthy"
docker compose logs -f app
```

Na primeira vez, com o banco vazio, o próprio servidor cria a empresa, o cardápio padrão e o
administrador a partir de `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` (mínimo de 12
caracteres). Com dados já cadastrados ele não faz nada, então manter essas variáveis não
sobrescreve o cardápio nem a senha alterada depois.

> ⚠️ O `npm run db:seed` manual, ao contrário, recria o cardápio padrão e sobrescreve preços,
> descrições e ordem dos itens que a equipe já tiver editado. Evite rodá-lo em produção.

## 3. Atualizar para uma nova versão

1. Faça o backup do banco (seção 4).
2. Atualize o código (`git pull` da versão desejada).
3. `docker compose up --build -d` — o serviço `migrate` aplica só as migrations novas.
4. Confira `docker compose ps` e os logs.

## 4. Backup e restauração do banco

Backup (gera um arquivo com data):

```sh
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > backup-$(date +%F).dump
```

Guarde os backups **fora do servidor** (outro disco, nuvem) e faça-os pelo menos uma vez
por dia (por exemplo com `cron`). Teste a restauração periodicamente.

Restauração (substitui o conteúdo do banco pelo backup):

```sh
docker compose stop app
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < backup-AAAA-MM-DD.dump
docker compose start app
```

As imagens ficam no Cloudflare R2, fora do banco; o bucket não precisa de backup pelo
sistema, mas vale ativar a retenção de versões no painel da Cloudflare.

## 5. Reverter uma versão

1. Volte o código para a versão anterior (`git checkout <versão>`).
2. Se a versão nova aplicou migrations, **restaure o backup feito antes da atualização**
   (seção 4): migrations não são desfeitas automaticamente.
3. `docker compose up --build -d`.

## 6. Checklist de produção

- [ ] Segredos novos (sessão, R2, banco, administrador) e `.env` fora do Git
- [ ] `APP_URL` com o domínio público e HTTPS ativo
- [ ] `TRUST_PROXY` coerente com a infraestrutura
- [ ] E-mail (SMTP) testado com "Esqueci minha senha"
- [ ] R2 testado enviando uma imagem no cardápio
- [ ] `docker compose ps` com `app` em `healthy`
- [ ] Backup diário configurado e restauração testada
- [ ] Banco sem porta pública (o Compose publica só em `127.0.0.1`)
