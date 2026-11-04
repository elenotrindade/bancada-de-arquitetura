const MAX_SIDE = 1600;
const MAX_FILE = 20 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/** Só aceitamos imagens embutidas como data URL destes formatos, geradas pelo próprio app. */
export const SAFE_IMAGE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;

const loadBitmap = (blob: Blob) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível abrir a imagem.')); };
  img.src = url;
});

/**
 * Lê um arquivo de imagem e sempre redesenha num canvas antes de guardar.
 * Isso descarta metadados (como localização GPS de fotos), bloqueia SVG e reduz o tamanho
 * para no máximo 1600 px no maior lado.
 */
export async function fileToImage(file: Blob): Promise<{ src: string; ratio: number }> {
  if (!ALLOWED.has(file.type)) throw new Error('Use uma imagem PNG, JPEG, WebP ou GIF.');
  if (file.size > MAX_FILE) throw new Error('Imagem grande demais (máximo de 20 MB).');
  const img = await loadBitmap(file);
  const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem.');
  const photo = file.type === 'image/jpeg';
  if (photo) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const src = photo ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');
  return { src, ratio: h / w };
}
