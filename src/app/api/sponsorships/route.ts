import { randomUUID } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import type { SigaaStudentRecord, SponsorshipEdgeData, StudentNodeData } from '../../../data/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const dataDirectory = path.join(process.cwd(), 'src', 'data');
const studentsPath = path.join(dataDirectory, 'students.json');
const sponsorshipsPath = path.join(dataDirectory, 'sponsorships.json');
const sigaaPath = path.join(dataDirectory, 'sigaa-students.json');
const allowedSemesters = new Set(['2024.1', '2024.2', '2025.1', '2025.2', '2026.1']);
let writeQueue: Promise<unknown> = Promise.resolve();

type TrioInput = {
  calouroMatricula: string;
  p2Matricula: string;
  veteranoMatricula: string;
  semester: string;
};

type JsonResult = { students: StudentNodeData[]; sponsorships: SponsorshipEdgeData[] };

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function normalizeName(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function safeSlug(value: string) {
  return normalizeName(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function readCurrentData(): Promise<JsonResult> {
  const [students, sponsorships] = await Promise.all([
    readJson<StudentNodeData[]>(studentsPath),
    readJson<SponsorshipEdgeData[]>(sponsorshipsPath),
  ]);
  return { students, sponsorships };
}

async function saveBoth(students: StudentNodeData[], sponsorships: SponsorshipEdgeData[]) {
  const files = [
    { path: studentsPath, content: `${JSON.stringify(students, null, 2)}\n` },
    { path: sponsorshipsPath, content: `${JSON.stringify(sponsorships, null, 2)}\n` },
  ];
  const originals = await Promise.all(files.map(({ path: filePath }) => readFile(filePath)));
  const temporaryPaths = files.map(({ path: filePath }) => `${filePath}.${randomUUID()}.tmp`);
  try {
    await Promise.all(files.map(({ content }, index) => writeFile(temporaryPaths[index], content, { encoding: 'utf8', flag: 'wx' })));
    await rename(temporaryPaths[0], files[0].path);
    await rename(temporaryPaths[1], files[1].path);
  } catch (error) {
    await Promise.all(temporaryPaths.map((temporaryPath) => readFile(temporaryPath).then(() => import('node:fs/promises').then(({ unlink }) => unlink(temporaryPath))).catch(() => undefined)));
    // Restore a consistent pair if the second rename failed after the first succeeded.
    await Promise.all(files.map(async ({ path: filePath }, index) => {
      const restorePath = `${filePath}.${randomUUID()}.restore`;
      await writeFile(restorePath, originals[index]);
      await rename(restorePath, filePath);
    }));
    throw error;
  }
}

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(work, work);
  writeQueue = next.catch(() => undefined);
  return next;
}

export async function GET() {
  try {
    return NextResponse.json(await readCurrentData(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Failed to read sponsorship data', error);
    return NextResponse.json({ error: 'Não foi possível ler os dados de apadrinhamento.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo JSON inválido.' }, { status: 400 });
  }
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { trios?: unknown }).trios)) {
    return NextResponse.json({ error: 'Envie uma lista de trios.' }, { status: 400 });
  }
  const trios = (payload as { trios: unknown[] }).trios;
  if (!trios.length || trios.length > 200) {
    return NextResponse.json({ error: 'Envie entre 1 e 200 trios por solicitação.' }, { status: 400 });
  }
  const parsed: TrioInput[] = [];
  for (const item of trios) {
    if (!item || typeof item !== 'object') return NextResponse.json({ error: 'Trio inválido.' }, { status: 400 });
    const trio = item as Record<string, unknown>;
    const values = [trio.calouroMatricula, trio.p2Matricula, trio.veteranoMatricula, trio.semester];
    if (values.some((value) => typeof value !== 'string' || !value.trim())) {
      return NextResponse.json({ error: 'Cada trio precisa conter três matrículas e um semestre.' }, { status: 400 });
    }
    const [calouroMatricula, p2Matricula, veteranoMatricula, semester] = values as string[];
    if (!allowedSemesters.has(semester)) return NextResponse.json({ error: `Semestre inválido: ${semester}.` }, { status: 400 });
    if (new Set([calouroMatricula, p2Matricula, veteranoMatricula]).size !== 3) {
      return NextResponse.json({ error: 'Calouro(a), P2 e veterano(a) precisam ser pessoas distintas.' }, { status: 400 });
    }
    parsed.push({ calouroMatricula, p2Matricula, veteranoMatricula, semester });
  }

  try {
    return await enqueue(async () => {
      const [current, sigaaRecords] = await Promise.all([
        readCurrentData(),
        readJson<SigaaStudentRecord[]>(sigaaPath),
      ]);
      const officialByMatricula = new Map(sigaaRecords.map((record) => [record.matricula, record]));
      const students = [...current.students];
      const sponsorships = [...current.sponsorships];
      const studentByMatricula = new Map(students.filter((student) => student.matricula).map((student) => [student.matricula!, student]));
      const studentByOfficialName = new Map(students.map((student) => [normalizeName(student.canonicalName), student]));
      const byMatricula = new Map<string, StudentNodeData>();
      const newIds = new Map<string, string>();
      let studentRecordsChanged = false;

      for (const trio of parsed) {
        for (const matricula of [trio.calouroMatricula, trio.p2Matricula, trio.veteranoMatricula]) {
          const official = officialByMatricula.get(matricula);
          if (!official) return NextResponse.json({ error: `Matrícula ${matricula} não está no cadastro ativo do SIGAA.` }, { status: 422 });
          let student = studentByMatricula.get(matricula) ?? studentByOfficialName.get(normalizeName(official.name));
          if (student?.matricula && student.matricula !== matricula) {
            return NextResponse.json({ error: `Nome SIGAA ambíguo para matrícula ${matricula}.` }, { status: 409 });
          }
          if (!student) {
            student = {
              id: `sigaa-${matricula}`,
              canonicalName: official.name,
              displayName: official.name,
              matricula,
              cohort: `${official.inferredCohort ?? matricula.slice(0, 4)}.1`,
              aliases: [],
              sigaaVerified: true,
              matchConfidence: 'EXACT',
            };
            const duplicateId = students.find((known) => known.id === student!.id);
            if (duplicateId && duplicateId.matricula !== matricula) {
              return NextResponse.json({ error: `Identificador de estudante duplicado para matrícula ${matricula}.` }, { status: 409 });
            }
            students.push(student);
            studentByMatricula.set(matricula, student);
            studentByOfficialName.set(normalizeName(official.name), student);
            newIds.set(matricula, student.id);
            studentRecordsChanged = true;
          } else if (!student.matricula || !student.sigaaVerified) {
            // Promote a matching historical/PDF node instead of creating a second node.
            student.matricula = matricula;
            student.sigaaVerified = true;
            student.matchConfidence = 'EXACT';
            studentByMatricula.set(matricula, student);
            studentRecordsChanged = true;
          }
          byMatricula.set(matricula, student);
        }
      }

      let addedSponsorships = 0;
      for (const trio of parsed) {
        const child = byMatricula.get(trio.calouroMatricula)!;
        const p2 = byMatricula.get(trio.p2Matricula)!;
        const veteran = byMatricula.get(trio.veteranoMatricula)!;
        for (const link of [
          { godparentId: p2.id, godchildId: child.id, role: 'P2' as const },
          { godparentId: veteran.id, godchildId: child.id, role: 'VETERANO' as const },
        ]) {
          const duplicate = sponsorships.some((edge) => edge.godparentId === link.godparentId && edge.godchildId === link.godchildId && edge.role === link.role && edge.semester === trio.semester);
          if (!duplicate) {
            sponsorships.push({ ...link, id: `${trio.semester}-${link.role.toLowerCase()}-${safeSlug(link.godparentId)}-${safeSlug(link.godchildId)}-${randomUUID().slice(0, 8)}`, semester: trio.semester, sourceDoc: 'user-added' });
            addedSponsorships += 1;
          }
        }
      }

      if (studentRecordsChanged || sponsorships.length !== current.sponsorships.length) {
        await saveBoth(students, sponsorships);
      }
      return NextResponse.json({ students, sponsorships, addedStudents: newIds.size, addedSponsorships }, { headers: { 'Cache-Control': 'no-store' } });
    });
  } catch (error) {
    console.error('Failed to persist sponsorship data', error);
    return NextResponse.json({ error: 'Não foi possível salvar os dados de apadrinhamento.' }, { status: 500 });
  }
}
