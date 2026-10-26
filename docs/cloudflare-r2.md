# Imagens no Cloudflare R2

As imagens do cardápio e a logo da página de orçamento ficam no Cloudflare R2. O banco
guarda apenas a URL pública de cada arquivo.

## Custo

O plano gratuito do R2 inclui, por mês, 10 GB de armazenamento, 1 milhão de operações de
escrita e 10 milhões de leituras. A transferência para quem visualiza as imagens não é
cobrada. Um cardápio com centenas de fotos de até 2 MB fica bem abaixo desse limite.

> A Cloudflare pede um cartão de crédito (ou PayPal) para ativar o R2, mesmo no plano
> gratuito. A cobrança só acontece se o uso passar dos limites acima.

## 1. Criar a conta e ativar o R2

1. Crie uma conta em <https://dash.cloudflare.com/sign-up> (ou entre na existente).
2. No menu lateral, abra **R2 Object Storage**.
3. Clique em **Comprar R2** / **Ativar R2**, cadastre a forma de pagamento e confirme o plano
   gratuito.

## 2. Criar o bucket

1. Em **R2 Object Storage**, clique em **Criar bucket**.
2. Nome: por exemplo `buffet-imagens` (minúsculas, números e hífens).
3. Localização: deixe **Automático**.
4. Classe de armazenamento: **Padrão**.
5. Clique em **Criar bucket**.

Esse nome vai na variável `R2_BUCKET`.

## 3. Liberar o acesso público às imagens

As imagens aparecem no formulário público, por isso o bucket precisa de uma URL pública.
Abra o bucket → aba **Configurações** e escolha uma das opções:

**Opção A — domínio próprio (recomendado para produção).** Exige que o domínio do buffet
esteja gerenciado na Cloudflare.

1. Em **Domínios personalizados**, clique em **Adicionar**.
2. Informe um subdomínio, por exemplo `imagens.seudominio.com.br`, e confirme.
3. Aguarde o status ficar **Ativo** (a Cloudflare cria o DNS sozinha).
4. `R2_PUBLIC_URL="https://imagens.seudominio.com.br"`

**Opção B — subdomínio `r2.dev` (bom para testes).** A Cloudflare limita a velocidade desse
endereço, por isso não é indicado para produção.

1. Em **URL de desenvolvimento público** (Public Development URL), clique em **Permitir**.
2. Digite `allow` para confirmar.
3. Copie a URL exibida, algo como `https://pub-xxxxxxxx.r2.dev`.
4. `R2_PUBLIC_URL="https://pub-xxxxxxxx.r2.dev"`

Não é preciso configurar CORS: o navegador envia a imagem para o nosso servidor, que valida
o arquivo e faz o envio ao R2.

## 4. Criar a chave de acesso (token da API)

1. Volte para a página inicial do **R2 Object Storage**.
2. Clique em **Gerenciar tokens da API** (Manage API Tokens) → **Criar token da API**.
3. Configure:
   - **Nome:** `buffet-app`
   - **Permissões:** **Leitura e gravação de objetos** (Object Read & Write)
   - **Aplicar a buckets específicos:** selecione somente o bucket criado
   - **TTL:** sem expiração (ou a validade que preferir)
4. Clique em **Criar token**.
5. Copie **imediatamente** os valores exibidos. O segredo aparece uma única vez:
   - **ID da chave de acesso** → `R2_ACCESS_KEY_ID`
   - **Chave de acesso secreta** → `R2_SECRET_ACCESS_KEY`

O **ID da conta** (Account ID) aparece na página inicial do R2 e também no endpoint
`https://<ID_DA_CONTA>.r2.cloudflarestorage.com`. Ele vai em `R2_ACCOUNT_ID`.

## 5. Configurar o projeto

No arquivo `.env` (nunca no código nem no Git):

```env
R2_ACCOUNT_ID="seu-account-id"
R2_ACCESS_KEY_ID="sua-access-key-id"
R2_SECRET_ACCESS_KEY="sua-secret-access-key"
R2_BUCKET="buffet-imagens"
R2_PUBLIC_URL="https://imagens.seudominio.com.br"
```

Reinicie a aplicação (`npm run dev` ou `docker compose up -d`). O `compose.yaml` já repassa
essas variáveis para o container.

## 6. Testar

1. Entre no painel e abra **Cardápio** → edite um item → **Imagem opcional**.
2. Escolha uma imagem PNG, JPG ou WebP de até 2 MB e salve.
3. No painel da Cloudflare, abra o bucket: o arquivo aparece em
   `empresas/<id-da-empresa>/servicos/`.
4. Abra o formulário público e confira se a foto aparece.

Se aparecer "Armazenamento de imagens não configurado", alguma variável `R2_*` está vazia ou
a aplicação não foi reiniciada.

## 7. Migrar as imagens antigas

Imagens enviadas antes desta mudança estão gravadas no banco em base64. Depois de configurar
o `.env`, rode uma vez:

```sh
npm run imagens:migrar-r2
```

O script envia cada imagem para o R2 e troca o conteúdo do banco pela URL. Ele pode ser
executado de novo com segurança: só processa o que ainda estiver em base64.

## Segurança

- O token tem acesso apenas ao bucket das imagens. Se ele vazar, revogue-o em
  **Gerenciar tokens da API** e crie outro.
- O servidor confere o conteúdo real do arquivo (PNG, JPEG ou WebP) e o tamanho máximo de
  2 MB. SVG e outros formatos são recusados.
- Ao trocar ou remover uma imagem, o arquivo antigo é apagado do bucket.
