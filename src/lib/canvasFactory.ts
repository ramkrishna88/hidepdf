import { createCanvas } from '@napi-rs/canvas';

export function makeCanvasFactory(): any {
  return {
    create(width: number, height: number) {
      const canvas = createCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
      return {
        canvas,
        context: canvas.getContext('2d')
      };
    },
    reset(pair: { canvas: { width: number; height: number } }, width: number, height: number) {
      pair.canvas.width = Math.max(1, Math.ceil(width));
      pair.canvas.height = Math.max(1, Math.ceil(height));
    },
    destroy(pair: { canvas: { width: number; height: number } }) {
      pair.canvas.width = 0;
      pair.canvas.height = 0;
    }
  };
}
