type ViewProps = { id: string; data: unknown; selected?: boolean; isConnectable?: boolean; width?: number; height?: number };

/**
 * Os nós não desenham nada que dependa da posição: quem move é o contêiner do React Flow.
 * Ignorar a posição na comparação evita re-renderizar o conteúdo (e as quatro alças)
 * de cada elemento a cada quadro em que ele é arrastado.
 */
export function sameNodeView<P extends ViewProps>(a: P, b: P) {
  return a.id === b.id && a.data === b.data && a.selected === b.selected &&
    a.isConnectable === b.isConnectable && a.width === b.width && a.height === b.height;
}
