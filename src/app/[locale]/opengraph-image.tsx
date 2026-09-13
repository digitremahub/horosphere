import { brandOgImage, size, contentType } from './ogBrand';

export const runtime = 'nodejs';
export { size, contentType };

export default function Image() {
  return brandOgImage();
}
