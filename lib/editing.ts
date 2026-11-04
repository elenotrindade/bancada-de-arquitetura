'use client';
import { createContext, useContext } from 'react';

/**
 * Id do elemento em edição, distribuído por contexto. Antes cada nó e cada conexão
 * assinava o estado global e era consultado a cada movimento do mouse; com o contexto,
 * só re-renderizam quando a edição de fato começa ou termina.
 */
export const EditingContext = createContext<string | null>(null);
export const useIsEditing = (id: string) => useContext(EditingContext) === id;
