import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader } from "@/components/panel";
import { AvisoClientesParecidos } from "@/features/clientes/clientes-parecidos";
import {
  descreverParecidos,
  useClientesParecidos,
  type ContatoDigitado,
} from "@/features/clientes/use-clientes-parecidos";
import { ClienteForm } from "@/features/clientes/cliente-form";
import { criarCliente, verificarClienteExistente } from "@/features/clientes/server-functions";
import { useConfirmar } from "@/lib/confirmacao";

export const Route = createFileRoute("/admin/clientes/novo")({
  head: () => ({
    meta: [
      { title: "Novo cliente — Mesly Buffet & Eventos" },
      {
        name: "description",
        content: "Cadastre um novo cliente com dados pessoais, endereço e informações comerciais.",
      },
      { property: "og:title", content: "Novo cliente — Mesly Buffet & Eventos" },
      { property: "og:description", content: "Formulário de cadastro de clientes do buffet." },
    ],
  }),
  component: NovoCliente,
});

function mensagem(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível salvar o cliente.";
}

function NovoCliente() {
  const navigate = useNavigate();
  const criar = useServerFn(criarCliente);
  const verificar = useServerFn(verificarClienteExistente);
  const confirmar = useConfirmar();
  const [salvando, setSalvando] = useState(false);
  const [contato, setContato] = useState<ContatoDigitado>({});
  const parecidos = useClientesParecidos(contato);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Novo cliente" subtitle="Preencha os dados do cliente" />
      <AvisoClientesParecidos parecidos={parecidos} />
      <ClienteForm
        onContatoAlterado={setContato}
        salvando={salvando}
        textoSalvar="Salvar cliente"
        cancelarPara="/admin/clientes"
        onSalvar={async (dados) => {
          setSalvando(true);
          try {
            // Confere de novo no envio: a última digitação pode não ter sido verificada.
            const encontrados = await verificar({
              data: {
                nome: dados.nome,
                telefone: dados.telefone,
                whatsapp: dados.whatsapp,
                email: dados.email,
              },
            });
            if (
              encontrados.length &&
              !(await confirmar({
                titulo: "Cadastrar mesmo assim?",
                descricao: `Já existe um cadastro parecido: ${descreverParecidos(encontrados)}.`,
                textoConfirmar: "Cadastrar novo cliente",
              }))
            ) {
              return;
            }
            await criar({ data: { ...dados, ignorarParecidos: encontrados.length > 0 } });
            toast.success("Cliente salvo com sucesso.");
            await navigate({ to: "/admin/clientes" });
          } catch (error) {
            toast.error(mensagem(error));
          } finally {
            setSalvando(false);
          }
        }}
      />
    </div>
  );
}
