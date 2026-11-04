const MAX_SIDE = 1600;
const KEEP_IF_UNDER = 600 * 1024;

const readAsDataURL = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
  img.src = src;
});

/** Lê um arquivo de imagem e reduz para no máximo 1600 px no maior lado, para caber bem no armazenamento local. */
export async function fileToImage(file: Blob): Promise<{ src: string; ratio: number }> {
  if (!file.type.startsWith('image/')) throw new Error('O arquivo não é uma imagem.');
  const original = await readAsDataURL(file);
  const img = await loadImage(original);
  const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
  const ratio = h / w;
  if (file.size <= KEEP_IF_UNDER && Math.max(w, h) <= MAX_SIDE) return { src: original, ratio };
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { src: canvas.toDataURL('image/jpeg', 0.85), ratio };
}
