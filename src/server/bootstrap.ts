import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolvePaths } from '../paths';
import { listDocs, upsertDoc, type DocCategory } from './docsStore';
import { listJobs, RUNNING_STATUSES, updateJob } from './jobStore';

export function ensureStorage(): void {
  const paths = resolvePaths();
  for (const dir of [paths.storageDir, paths.jobsDir, paths.docsDir, paths.tracesDir]) {
    mkdirSync(dir, { recursive: true });
  }
}

const SEED_FILES = ['profile.yaml', 'resume.yaml', 'personal.md'];

/** Copy the personal seed into SEED_DIR when the volume is empty and a bootstrap source is set. */
export function ensureSeed(): void {
  const { seedDir } = resolvePaths();
  if (existsSync(join(/*turbopackIgnore: true*/ seedDir, 'resume.yaml'))) return;
  const source = process.env.BOOTSTRAP_SEED_DIR;
  if (!source || source === '') return;
  for (const file of SEED_FILES) {
    const from = join(/*turbopackIgnore: true*/ source, file);
    if (!existsSync(from)) continue;
    mkdirSync(seedDir, { recursive: true });
    copyFileSync(from, join(/*turbopackIgnore: true*/ seedDir, file));
  }
}

interface BootstrapDoc {
  file: string;
  category: DocCategory;
  slug: string;
  title: string;
}

/** Mapping of the personal reference markdown at the repo root into app doc categories. */
const DOC_BOOTSTRAP_MAP: BootstrapDoc[] = [
  { file: '00_LINKS_INDEX.md', category: 'reference', slug: 'links-index', title: 'Links index' },
  {
    file: '01_interviewprep_system_prompt.md',
    category: 'system-prompts',
    slug: 'interview-prep-system-prompt',
    title: 'Interview prep system prompt',
  },
  {
    file: '02_interviewlog.md',
    category: 'interview',
    slug: 'interview-log',
    title: 'Interview log',
  },
  {
    file: '03_job_application_MoE_system_prompt.md',
    category: 'system-prompts',
    slug: 'job-application-moe-system-prompt',
    title: 'Job application MoE system prompt',
  },
  {
    file: '06_Nikan_Khadka_Interview_Prep_Playbook.md',
    category: 'playbook',
    slug: 'interview-prep-playbook',
    title: 'Interview prep playbook',
  },
  {
    file: '07_project_memory_notes.md',
    category: 'memory',
    slug: 'project-memory-notes',
    title: 'Project memory notes',
  },
  {
    file: 'masterresume/masterresume.md',
    category: 'resume-archive',
    slug: 'master-resume',
    title: 'Master resume',
  },
];

/** Seed the docs store from BOOTSTRAP_DOCS_DIR the first time, never overwriting edits. */
export function ensureDocs(): void {
  if (listDocs().length > 0) return;
  const source = process.env.BOOTSTRAP_DOCS_DIR;
  if (!source || source === '') return;
  for (const doc of DOC_BOOTSTRAP_MAP) {
    const from = join(/*turbopackIgnore: true*/ source, doc.file);
    if (!existsSync(from)) continue;
    upsertDoc(doc.category, doc.slug, readFileSync(from, 'utf8'));
  }
}

/** A restart cannot resume in-flight work: mark anything mid-pipeline as errored. */
export function sweepInterruptedJobs(): void {
  for (const job of listJobs()) {
    if (RUNNING_STATUSES.includes(job.status)) {
      updateJob(job.id, { status: 'error', error: 'interrupted by restart' });
    }
  }
}

export function ensureBoot(): void {
  ensureStorage();
  ensureSeed();
  ensureDocs();
  sweepInterruptedJobs();
}
