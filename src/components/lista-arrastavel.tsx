import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

/** Alça pronta para o item: é por ela que se arrasta (mouse, toque ou teclado). */
export type AlcaDeArrastar = ReactNode;

/**
 * Lista reordenável por arrastar. A nova ordem aparece na hora e é enviada em onReordenar;
 * se o salvamento falhar, a lista volta para a ordem recebida em `itens`.
 */
export function ListaArrastavel<T extends { id: string }>({
  itens,
  onReordenar,
  desativado = false,
  rotuloDoItem,
  className,
  children,
}: {
  itens: T[];
  onReordenar: (ids: string[]) => Promise<unknown> | void;
  /** Esconde as alças (ex.: durante uma busca, quando parte da lista está oculta). */
  desativado?: boolean;
  /** Nome usado pelo leitor de tela na alça, ex.: "categoria Aves". */
  rotuloDoItem: (item: T) => string;
  className?: string;
  children: (item: T, alca: AlcaDeArrastar | null) => ReactNode;
}) {
  const idDoContexto = useId();
  const recebidos = itens.map((item) => item.id).join("|");
  const [ordem, setOrdem] = useState<string[]>(() => itens.map((item) => item.id));
  // Nova lista do servidor (ou itens adicionados/removidos): passa a valer a ordem recebida.
  useEffect(() => setOrdem(recebidos ? recebidos.split("|") : []), [recebidos]);

  const sensores = useSensors(
    // Um pequeno deslocamento evita que um clique vire arrasto.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // No celular, segurar um instante na alça antes de arrastar não atrapalha a rolagem.
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const porId = new Map(itens.map((item) => [item.id, item]));
  const ordenados = ordem.flatMap((id) => (porId.has(id) ? [porId.get(id)!] : []));

  async function aoSoltar({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const anterior = ordem;
    const nova = arrayMove(ordem, ordem.indexOf(String(active.id)), ordem.indexOf(String(over.id)));
    setOrdem(nova);
    try {
      await onReordenar(nova);
    } catch {
      setOrdem(anterior);
    }
  }

  return (
    <DndContext
      id={idDoContexto}
      sensors={sensores}
      collisionDetection={closestCenter}
      onDragEnd={(evento) => void aoSoltar(evento)}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Para mover, pressione espaço, use as setas para escolher a posição e espaço de novo para soltar.",
        },
      }}
    >
      <SortableContext items={ordem} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {ordenados.map((item) => (
            <ItemArrastavel
              key={item.id}
              id={item.id}
              rotulo={rotuloDoItem(item)}
              desativado={desativado}
            >
              {(alca) => children(item, alca)}
            </ItemArrastavel>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function ItemArrastavel({
  id,
  rotulo,
  desativado,
  children,
}: {
  id: string;
  rotulo: string;
  desativado: boolean;
  children: (alca: AlcaDeArrastar | null) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: desativado });
  const estilo: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 20 : undefined,
  };
  const alca = desativado ? null : (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Arrastar para reordenar ${rotulo}`}
      title="Arraste para mudar a ordem"
      className="text-muted-foreground hover:text-foreground hover:bg-accent grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md active:cursor-grabbing"
    >
      <GripVertical className="size-4" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={estilo} className={cn(isDragging && "opacity-90 shadow-xl")}>
      {children(alca)}
    </div>
  );
}
