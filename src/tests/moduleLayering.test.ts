import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const MODULES_DIR = join(__dirname, '..', 'modules');

function listModuleFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listModuleFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

const IMPORT_PATTERN = /(?:import|from)\s+['"]@\/modules\/([a-z-]+)\/([a-z-]+)\/([^'"]+)['"]/g;

interface CrossModuleImport {
  file: string;
  targetModule: string;
  targetLayer: string;
  targetPath: string;
}

function crossModuleImportsOf(file: string, ownModule: string): CrossModuleImport[] {
  const text = readFileSync(file, 'utf8');
  const hits: CrossModuleImport[] = [];
  for (const match of text.matchAll(IMPORT_PATTERN)) {
    const targetModule = match[1] ?? '';
    const targetLayer = match[2] ?? '';
    const targetPath = match[3] ?? '';
    if (targetModule !== ownModule) {
      hits.push({ file, targetModule, targetLayer, targetPath });
    }
  }
  return hits;
}

function applicationFiles(): Array<{ file: string; ownModule: string }> {
  return listModuleFiles(MODULES_DIR)
    .filter((file) => file.includes(`application${sep}`))
    .map((file) => {
      const relative = file.slice(MODULES_DIR.length + 1);
      const ownModule = relative.split(/[\\/]/)[0] ?? '';
      return { file, ownModule };
    });
}

function infrastructureFiles(): Array<{ file: string; ownModule: string }> {
  return listModuleFiles(MODULES_DIR)
    .filter((file) => file.includes(`infrastructure${sep}`))
    .map((file) => {
      const relative = file.slice(MODULES_DIR.length + 1);
      const ownModule = relative.split(/[\\/]/)[0] ?? '';
      return { file, ownModule };
    });
}

describe('module layering rules BUG-056 BUG-057 BUG-058', () => {
  it('forbids application layers from importing another module infrastructure layer', () => {
    const violations: string[] = [];
    for (const { file, ownModule } of applicationFiles()) {
      for (const hit of crossModuleImportsOf(file, ownModule)) {
        if (hit.targetLayer === 'infrastructure') {
          violations.push(`${file} imports @/modules/${hit.targetModule}/infrastructure/${hit.targetPath}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('forbids infrastructure layers from importing another module application layer', () => {
    const violations: string[] = [];
    for (const { file, ownModule } of infrastructureFiles()) {
      for (const hit of crossModuleImportsOf(file, ownModule)) {
        if (hit.targetLayer === 'application') {
          violations.push(`${file} imports @/modules/${hit.targetModule}/application/${hit.targetPath}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('requires cross-module application imports to go through the application barrel', () => {
    const violations: string[] = [];
    for (const { file, ownModule } of applicationFiles()) {
      for (const hit of crossModuleImportsOf(file, ownModule)) {
        if (hit.targetLayer === 'application' && hit.targetPath !== 'index') {
          violations.push(`${file} imports @/modules/${hit.targetModule}/application/${hit.targetPath}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
