import { connection } from 'next/server';
import Board from '@/components/Board';

export default async function Page() {
  // Renderização por requisição: necessária para o nonce da Content Security Policy.
  await connection();
  return <Board />;
}
