-- Modo "Pedido pelo WhatsApp": o formulário público não cria conta nem leva ao portal do cliente;
-- no fim, o pedido abre no WhatsApp da empresa. Começa desligado (comportamento atual).
ALTER TABLE "empresas" ADD COLUMN "pedido_pelo_whatsapp" BOOLEAN NOT NULL DEFAULT false;
-- Texto que fecha a mensagem do pedido (ex.: "OBS. Será entregue tudo arrumado nas travessas.").
ALTER TABLE "empresas" ADD COLUMN "rodape_pedido_whatsapp" TEXT;
