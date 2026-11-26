import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const dataDirectory = path.resolve(process.env.DATA_DIR || path.join(here, '../src/data'));
export const studentsPath = path.join(dataDirectory, 'students.json');
export const sponsorshipsPath = path.join(dataDirectory, 'sponsorships.json');
export const sigaaPath = path.join(dataDirectory, 'sigaa-students.json');

let writeQueue = Promise.resolve();

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function readCurrentData() {
  const [students, sponsorships] = await Promise.all([
    readJson(studentsPath),
    readJson(sponsorshipsPath),
  ]);
  if (!Array.isArray(students) || !Array.isArray(sponsorships)) {
    throw new Error('Student and sponsorship data files must contain JSON arrays.');
  }
  return { students, sponsorships };
}

export async function readSigaaRecords() {
  const records = await readJson(sigaaPath);
  if (!Array.isArray(records)) {
    throw new Error('SIGAA data file must contain a JSON array.');
  }
  return records;
}

export function withWriteQueue(work) {
  const result = writeQueue.then(work, work);
  writeQueue = result.catch(() => undefined);
  return result;
}

export async function persistData(students, sponsorships) {
  await mkdir(dataDirectory, { recursive: true });
  const files = [
    { path: studentsPath, content: `${JSON.stringify(students, null, 2)}\n` },
    { path: sponsorshipsPath, content: `${JSON.stringify(sponsorships, null, 2)}\n` },
  ];
  const originals = await Promise.all(files.map(({ path: filePath }) => readFile(filePath).catch(() => null)));
  const tempPaths = files.map(({ path: filePath }) => `${filePath}.${randomUUID()}.tmp`);
  let committed = 0;
  try {
    await Promise.all(
      files.map(({ content }, index) => writeFile(tempPaths[index], content, { encoding: 'utf8', flag: 'wx' })),
    );
    for (let index = 0; index < files.length; index += 1) {
      await rename(tempPaths[index], files[index].path);
      committed += 1;
    }
  } catch (error) {
    await Promise.all(tempPaths.map((tempPath) => unlink(tempPath).catch(() => undefined)));
    for (let index = 0; index < committed; index += 1) {
      if (originals[index] !== null) {
        const restorePath = `${files[index].path}.${randomUUID()}.restore`;
        await writeFile(restorePath, originals[index]);
        await rename(restorePath, files[index].path);
      }
    }
    throw error;
  }
}
