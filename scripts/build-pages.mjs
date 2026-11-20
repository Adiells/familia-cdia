import { spawn } from 'node:child_process';
import { access, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routePath = path.join(root, 'src/app/api/sponsorships/route.ts');
const backupPath = `${routePath}.static-export-${process.pid}`;
let routeMoved = false;

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runBuild() {
  const nextCli = path.join(root, 'node_modules/next/dist/bin/next');
  const child = spawn(process.execPath, [nextCli, 'build'], {
    cwd: root,
    env: { ...process.env, STATIC_EXPORT: 'true' },
    stdio: 'inherit',
  });
  const forwardSignal = (signal) => child.kill(signal);
  process.once('SIGINT', forwardSignal);
  process.once('SIGTERM', forwardSignal);

  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      process.removeListener('SIGINT', forwardSignal);
      process.removeListener('SIGTERM', forwardSignal);
      if (code === 0) resolve();
      else reject(new Error(`next build exited with ${signal ? `signal ${signal}` : `status ${code}`}`));
    });
  });
}

try {
  // Next's static export supports static GET route handlers, but not this local
  // dynamic GET/POST file API. Temporarily park it if it still exists; Aegis may
  // move the local API to backend/ before this script is run.
  if (await exists(routePath)) {
    await rename(routePath, backupPath);
    routeMoved = true;
  }
  await runBuild();
} finally {
  if (routeMoved) {
    if (await exists(routePath)) {
      const [current, original] = await Promise.all([readFile(routePath), readFile(backupPath)]);
      if (!current.equals(original)) {
        process.stderr.write(`A route.ts was recreated during export; original preserved at ${backupPath}\n`);
        throw new Error('Refusing to overwrite a concurrently changed sponsorship API route.');
      }
      await rm(routePath);
    }
    await rename(backupPath, routePath);
  }
}
