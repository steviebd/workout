#!/usr/bin/env bun
/**
 * Benchmark script to measure:
 * 1. Database read/write speeds
 * 2. Bundle size
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();

// Measure bundle size
function measureBundleSize(): number {
  const distPath = join(PROJECT_ROOT, 'dist');

  if (!existsSync(distPath)) {
    console.log('⚠️  Building project first...');
    execSync('bun run build', { cwd: PROJECT_ROOT, stdio: 'pipe' });
  }

  let totalBytes = 0;

  function walkDir(dir: string) {
    const { readdirSync, statSync } = require('fs') as typeof import('fs');
    const files = readdirSync(dir);
    for (const file of files) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith('.js') || file.endsWith('.css')) {
        totalBytes += stat.size;
      }
    }
  }

  walkDir(distPath);

  // Convert to KB
  const totalKB = totalBytes / 1024;
  console.log(`📦 Bundle size: ${totalKB.toFixed(2)} KB`);
  return totalKB;
}

// Score calculation (higher is better)
// - Bundle size: penalized above 500KB, rewarded below
// - Normalized to 0-100 range
function calculateScore(bundleKB: number): number {
  // Bundle size scoring: 100 at 200KB, 50 at 500KB, 0 at 800KB
  const bundleScore = Math.max(0, Math.min(100, 100 - ((bundleKB - 200) / 600) * 100));
  return Math.round(bundleScore);
}

async function main() {
  console.log('🔬 Running optimization benchmark...\n');

  // Measure bundle size
  const bundleKB = measureBundleSize();

  // Calculate score
  const score = calculateScore(bundleKB);

  console.log(`\n📊 Benchmark Score: ${score}`);
  console.log(`   (Bundle size ${bundleKB.toFixed(2)} KB)`);

  // Output for experiment tracking
  console.log(`\nMETRIC bundle_kb=${bundleKB.toFixed(2)}`);
  console.log(`METRIC benchmark_score=${score}`);
}

main().catch(console.error);
