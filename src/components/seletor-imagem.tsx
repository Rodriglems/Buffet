import { useRef, type ChangeEvent } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Botão "Escolher imagem" no lugar do campo de arquivo do navegador, cujo texto
 * ("Escolher ficheiro / Nenhum ficheiro selecionado") varia com o idioma do navegador.
 */
export function SeletorImagem({
  id,
  temImagem,
  enviando,
  onChange,
}: {
  id: string;
  temImagem: boolean;
  enviando: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={campo}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={enviando}
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        disabled={enviando}
        onClick={() => campo.current?.click()}
      >
        {enviando ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {enviando ? "Enviando…" : temImagem ? "Trocar imagem" : "Escolher imagem"}
      </Button>
      <span className="text-muted-foreground text-xs">PNG, JPG ou WebP de até 2 MB</span>
    </div>
  );
}
