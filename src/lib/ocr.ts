import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { TextItem } from './types.js';

const require = createRequire(import.meta.url);

export async function ocrImageToItems(
  image: Buffer,
  pageWidth: number,
  pageHeight: number,
  scale: number
): Promise<TextItem[]> {
  const tmp = path.join(os.tmpdir(), `hidepdf-ocr-${process.pid}-${Date.now()}.png`);
  fs.writeFileSync(tmp, image);
  try {
    const raw = await runOcrCli(tmp, pageWidth, pageHeight, scale);
    const parsed = JSON.parse(raw) as TextItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function runOcrCli(imagePath: string, pageWidth: number, pageHeight: number, scale: number): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const compiled = path.join(here, 'ocrCli.js');
  const source = path.join(here, 'ocrCli.ts');
  const args = fs.existsSync(compiled)
    ? [compiled, imagePath, String(pageWidth), String(pageHeight), String(scale)]
    : [require.resolve('tsx/cli'), source, imagePath, String(pageWidth), String(pageHeight), String(scale)];

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('OCR timed out'));
    }, 45_000);
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `OCR exited ${code}`));
    });
  });
}
