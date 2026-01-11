import { inspect } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'server', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'healthscope.log');

export function dump(obj: any): string {
  try {
    return JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
  } catch {
    return inspect(obj, { depth: null, colors: false, maxArrayLength: null });
  }
}

async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

export async function logger(...parts: any[]) {
  const time = new Date().toISOString();
  const text = parts
    .map(p => (typeof p === 'string' ? p : dump(p)))
    .join(' ');
  const line = `${time} ${text}\n`;
  // write to console as well
  // eslint-disable-next-line no-console
  console.log(line.trim());

  try {
    await ensureLogDir();
    await fs.appendFile(LOG_FILE, line, 'utf8');
  } catch (e) {
    // best-effort: if logging to file fails, don't crash
    // eslint-disable-next-line no-console
    console.error('logger: failed to write log file', e?.toString?.() ?? e);
  }
}
