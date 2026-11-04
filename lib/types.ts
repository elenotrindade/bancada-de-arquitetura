import type { Edge, Node } from '@xyflow/react';
import type { ComponentKind } from './catalog';

export type ComponentData = { kind: ComponentKind; name: string; resp: string; tech: string };
export type NoteData = { text: string; color: string };
export type TextData = { text: string; size: 's' | 'm' | 'l' };
export type FrameData = { title: string; color: string };
export type ImageData = { src: string; caption: string; ratio: number };

export type ComponentNodeT = Node<ComponentData, 'component'>;
export type NoteNodeT = Node<NoteData, 'note'>;
export type TextNodeT = Node<TextData, 'text'>;
export type FrameNodeT = Node<FrameData, 'frame'>;
export type ImageNodeT = Node<ImageData, 'image'>;
export type AppNode = ComponentNodeT | NoteNodeT | TextNodeT | FrameNodeT | ImageNodeT;

export type PathType = 'smoothstep' | 'bezier' | 'straight';
export type ArchEdgeData = { label: string; async: boolean; pathType: PathType };
export type AppEdge = Edge<ArchEdgeData, 'arch'>;

export type Adr = { id: string; title: string; context: string; decision: string; consequences: string };

export type CustomScenario = { name: string; context: string; functional: string; quality: string; constraints: string };

export type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string; withImage?: boolean; error?: boolean };

export type Board = {
  id: string;
  nodes: AppNode[];
  edges: AppEdge[];
  adrs: Adr[];
  checks: Record<string, boolean>;
  twist: boolean;
  custom: CustomScenario;
  chat: ChatMsg[];
  viewport?: { x: number; y: number; zoom: number };
  sample?: boolean;
  updatedAt: number;
};

export type Tool = 'select' | 'hand' | 'note' | 'text' | 'frame';
export type SideTab = 'cenario' | 'detalhes' | 'decisoes' | 'ia';
