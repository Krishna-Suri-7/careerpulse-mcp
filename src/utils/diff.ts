import { LinkedInProfile, PartialLinkedInProfile, Experience, Education } from '../schemas/profile.js';

export interface DiffEntry {
  section: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  currentValue?: any;
  updatedValue?: any;
  diffText: string;
}

export interface ProfileDiffResult {
  hasChanges: boolean;
  totalChanges: number;
  additionsCount: number;
  modificationsCount: number;
  deletionsCount: number;
  markdown: string;
  entries: DiffEntry[];
}

/**
 * Computes simple line-by-line diff text with - and + prefixes
 */
export function createLineDiff(oldText: string, newText: string): string {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diffLines: string[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = oldLines[i];
    const n = newLines[i];

    if (o !== undefined && n !== undefined) {
      if (o === n) {
        diffLines.push(`  ${o}`);
      } else {
        diffLines.push(`- ${o}`);
        diffLines.push(`+ ${n}`);
      }
    } else if (o !== undefined) {
      diffLines.push(`- ${o}`);
    } else if (n !== undefined) {
      diffLines.push(`+ ${n}`);
    }
  }

  return diffLines.join('\n');
}

/**
 * Generates an end-to-end profile diff between current and updated profile states
 */
export function generateProfileDiff(
  current: LinkedInProfile,
  updated: PartialLinkedInProfile
): ProfileDiffResult {
  const entries: DiffEntry[] = [];
  let additionsCount = 0;
  let modificationsCount = 0;
  let deletionsCount = 0;

  // 1. Headline Diff
  if (updated.headline !== undefined && updated.headline !== current.headline) {
    modificationsCount++;
    const diffBlock = createLineDiff(current.headline || '(None)', updated.headline || '(None)');
    entries.push({
      section: 'Headline',
      type: current.headline ? 'modified' : 'added',
      currentValue: current.headline,
      updatedValue: updated.headline,
      diffText: diffBlock,
    });
  }

  // 2. Summary / About Diff
  if (updated.summary !== undefined && updated.summary !== current.summary) {
    modificationsCount++;
    const diffBlock = createLineDiff(current.summary || '(None)', updated.summary || '(None)');
    entries.push({
      section: 'Summary / About',
      type: current.summary ? 'modified' : 'added',
      currentValue: current.summary,
      updatedValue: updated.summary,
      diffText: diffBlock,
    });
  }

  // 3. Skills Diff
  if (updated.skills !== undefined) {
    const currentSet = new Set(current.skills.map((s) => s.toLowerCase()));
    const updatedSet = new Set(updated.skills.map((s) => s.toLowerCase()));

    const addedSkills = updated.skills.filter((s) => !currentSet.has(s.toLowerCase()));
    const removedSkills = current.skills.filter((s) => !updatedSet.has(s.toLowerCase()));

    if (addedSkills.length > 0 || removedSkills.length > 0) {
      const skillDiffLines: string[] = [];
      for (const r of removedSkills) {
        deletionsCount++;
        skillDiffLines.push(`- ${r}`);
      }
      for (const a of addedSkills) {
        additionsCount++;
        skillDiffLines.push(`+ ${a}`);
      }

      entries.push({
        section: 'Skills',
        type: 'modified',
        currentValue: current.skills,
        updatedValue: updated.skills,
        diffText: skillDiffLines.join('\n'),
      });
    }
  }

  // 4. Experience Diff
  if (updated.experiences !== undefined) {
    const currentExps = current.experiences;
    const updatedExps = updated.experiences;

    // Check additions and edits
    const maxExp = Math.max(currentExps.length, updatedExps.length);
    for (let i = 0; i < maxExp; i++) {
      const cur = currentExps[i];
      const upd = updatedExps[i];

      if (!cur && upd) {
        additionsCount++;
        const addedText = `+ Role: ${upd.title} at ${upd.company}\n` +
          (upd.bulletPoints && upd.bulletPoints.length > 0
            ? upd.bulletPoints.map((b) => `+   • ${b}`).join('\n')
            : `+   ${upd.description || ''}`);
        entries.push({
          section: `Experience [${i + 1}] Added: ${upd.title} at ${upd.company}`,
          type: 'added',
          updatedValue: upd,
          diffText: addedText,
        });
      } else if (cur && !upd) {
        deletionsCount++;
        const removedText = `- Role: ${cur.title} at ${cur.company}\n` +
          (cur.bulletPoints && cur.bulletPoints.length > 0
            ? cur.bulletPoints.map((b) => `-   • ${b}`).join('\n')
            : `-   ${cur.description || ''}`);
        entries.push({
          section: `Experience [${i + 1}] Removed: ${cur.title} at ${cur.company}`,
          type: 'removed',
          currentValue: cur,
          diffText: removedText,
        });
      } else if (cur && upd) {
        const curSerialized = `${cur.title} | ${cur.company}\n${(cur.bulletPoints || []).join('\n') || cur.description || ''}`;
        const updSerialized = `${upd.title} | ${upd.company}\n${(upd.bulletPoints || []).join('\n') || upd.description || ''}`;

        if (curSerialized !== updSerialized) {
          modificationsCount++;
          const diffBlock = createLineDiff(curSerialized, updSerialized);
          entries.push({
            section: `Experience [${i + 1}]: ${cur.title} at ${cur.company}`,
            type: 'modified',
            currentValue: cur,
            updatedValue: upd,
            diffText: diffBlock,
          });
        }
      }
    }
  }

  // 5. Education Diff
  if (updated.education !== undefined) {
    const curEduStr = current.education.map((e) => `${e.school}: ${e.degree || ''} (${e.fieldOfStudy || ''})`).join('\n');
    const updEduStr = updated.education.map((e) => `${e.school}: ${e.degree || ''} (${e.fieldOfStudy || ''})`).join('\n');

    if (curEduStr !== updEduStr) {
      modificationsCount++;
      const diffBlock = createLineDiff(curEduStr || '(None)', updEduStr || '(None)');
      entries.push({
        section: 'Education',
        type: 'modified',
        currentValue: current.education,
        updatedValue: updated.education,
        diffText: diffBlock,
      });
    }
  }

  const totalChanges = additionsCount + modificationsCount + deletionsCount;
  const hasChanges = totalChanges > 0;

  // Build Markdown representation
  const mdParts: string[] = [];
  mdParts.push('# Profile Changes Diff\n');
  mdParts.push(`**Summary:** ${totalChanges} changes (${additionsCount} additions, ${modificationsCount} modifications, ${deletionsCount} deletions)\n`);

  if (!hasChanges) {
    mdParts.push('_No differences detected between current profile and proposed updates._');
  } else {
    for (const entry of entries) {
      mdParts.push(`### ${entry.section} (${entry.type.toUpperCase()})`);
      mdParts.push('```diff');
      mdParts.push(entry.diffText);
      mdParts.push('```\n');
    }
  }

  return {
    hasChanges,
    totalChanges,
    additionsCount,
    modificationsCount,
    deletionsCount,
    markdown: mdParts.join('\n'),
    entries,
  };
}
