// Move imagens antigas salvas em base64 no banco para o Cloudflare R2.
// Uso: npm run imagens:migrar-r2   (pode ser executado mais de uma vez com segurança)
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { enviarImagem } from "../src/lib/storage.server.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL nao foi configurada.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function decodificar(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return new Uint8Array(Buffer.from(base64, "base64"));
}

try {
  const servicos = await prisma.servico.findMany({
    where: { imagemUrl: { startsWith: "data:" } },
    select: { id: true, empresaId: true, nome: true, imagemUrl: true },
  });
  for (const servico of servicos) {
    const url = await enviarImagem(
      `empresas/${servico.empresaId}/servicos`,
      decodificar(servico.imagemUrl),
    );
    await prisma.servico.update({ where: { id: servico.id }, data: { imagemUrl: url } });
    console.info(`Item "${servico.nome}" migrado.`);
  }

  const empresas = await prisma.empresa.findMany({
    where: { logoOrcamentoUrl: { startsWith: "data:" } },
    select: { id: true, nomeFantasia: true, logoOrcamentoUrl: true },
  });
  for (const empresa of empresas) {
    const url = await enviarImagem(
      `empresas/${empresa.id}/logos`,
      decodificar(empresa.logoOrcamentoUrl),
    );
    await prisma.empresa.update({ where: { id: empresa.id }, data: { logoOrcamentoUrl: url } });
    console.info(`Logo de "${empresa.nomeFantasia}" migrada.`);
  }

  console.info(`Concluído: ${servicos.length} itens e ${empresas.length} logos migrados.`);
} finally {
  await prisma.$disconnect();
}
