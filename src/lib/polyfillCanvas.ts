import { DOMMatrix, Image, ImageData, Path2D } from '@napi-rs/canvas';

Object.assign(globalThis, { Path2D, DOMMatrix, ImageData, Image });
