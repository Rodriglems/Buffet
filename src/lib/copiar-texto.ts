/**
 * Copia um texto para a área de transferência. A API moderna só existe em HTTPS ou localhost;
 * fora disso (ex.: celular acessando pelo IP da rede) usa o método antigo do navegador.
 */
export async function copiarTexto(texto: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(texto);
    return;
  }
  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.style.position = "fixed";
  campo.style.opacity = "0";
  document.body.appendChild(campo);
  campo.select();
  try {
    if (!document.execCommand("copy")) throw new Error("Não foi possível copiar.");
  } finally {
    campo.remove();
  }
}
