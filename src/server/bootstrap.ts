import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureOwnerUser } from './currentUser';
import { getDb, type Db } from './db';
import { listDocs, upsertDoc, type DocCategory } from './docsStore';
import { migrate } from './migrations';

const SEED_FILES = ['profile.yaml', 'resume.yaml', 'personal.md'];

/** Import BOOTSTRAP_SEED_DIR into the user's bank when they have none. Never overwrites. */
async function importSeed(db: Db, userId: string): Promise<void> {
  const source = process.env.BOOTSTRAP_SEED_DIR;
  if (!source || source === '') return;
  if ((await db.query('select 1 from banks where user_id = $1', [userId])).length > 0) return;
  if (!SEED_FILES.every((file) => existsSync(join(/*turbopackIgnore: true*/ source, file)))) return;
  const [profile, resume, personal] = SEED_FILES.map((file) =>
    readFileSync(join(/*turbopackIgnore: true*/ source, file), 'utf8'),
  );
  await db.query(
    `insert into banks (user_id, profile_yaml, resume_yaml, personal_md) values ($1, $2, $3, $4)
     on conflict (user_id) do nothing`,
    [userId, profile, resume, personal],
  );
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

/** Seed the user's docs from BOOTSTRAP_DOCS_DIR the first time, never overwriting edits. */
async function importDocs(userId: string): Promise<void> {
  const source = process.env.BOOTSTRAP_DOCS_DIR;
  if (!source || source === '') return;
  if ((await listDocs(userId)).length > 0) return;
  for (const doc of DOC_BOOTSTRAP_MAP) {
    const from = join(/*turbopackIgnore: true*/ source, doc.file);
    if (!existsSync(from)) continue;
    await upsertDoc(userId, doc.category, doc.slug, readFileSync(from, 'utf8'));
  }
}

/** Server start: migrate, make sure the owner user exists, import first-run seed data. */
export async function ensureBoot(): Promise<void> {
  const db = await getDb();
  await migrate(db);
  const userId = await ensureOwnerUser(db);
  await importSeed(db, userId);
  await importDocs(userId);
}
