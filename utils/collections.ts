import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const CONTENT_ROOT = path.join(process.cwd(), 'content');

export interface CollectionDoc {
  title: string;
  content: string;
  slug: string[];
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

/** All document slugs in a collection (e.g. `[['acknowledging'], ['school','david-swanson']]`). */
export function getCollectionSlugs(collection: string): string[][] {
  const root = path.join(CONTENT_ROOT, collection);
  return walk(root).map((file) =>
    path.relative(root, file).replace(/\.md$/, '').split(path.sep)
  );
}

/** Read and parse a single collection document, or null if missing. */
export function getCollectionDoc(
  collection: string,
  slug: string[]
): CollectionDoc | null {
  const file = path.join(CONTENT_ROOT, collection, ...slug) + '.md';
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, 'utf-8'));
  return {
    title: (data.title as string) ?? slug[slug.length - 1],
    content,
    slug,
  };
}
