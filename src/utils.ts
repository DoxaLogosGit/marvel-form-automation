// Utility functions for form automation

import type { DifficultySettings } from './types.js';

/**
 * Split an array into roughly equal chunks for parallel processing
 */
export function chunkArray<T>(array: T[], numChunks: number): T[][] {
  if (numChunks <= 0) {
    throw new Error('Number of chunks must be positive');
  }
  if (numChunks >= array.length) {
    // If we have more workers than items, give each item its own chunk
    return array.map(item => [item]);
  }

  const chunks: T[][] = [];
  const chunkSize = Math.ceil(array.length / numChunks);

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * Spider-Woman dual aspect mappings - she uses two aspects
 * Maps JSON values like "Justice & aggression" to form values like "Aggression and Justice"
 */
export function mapSpiderWomanAspects(aspect: string): string {
  const aspectLower = aspect.toLowerCase();

  // Extract the two aspects from the string
  const hasAggression = aspectLower.includes('aggression');
  const hasJustice = aspectLower.includes('justice');
  const hasLeadership = aspectLower.includes('leadership');
  const hasProtection = aspectLower.includes('protection');
  const hasBasic = aspectLower.includes('basic') || aspectLower.includes('pool');

  // Map to form values (form uses alphabetical order)
  if (hasAggression && hasJustice) return 'Aggression and Justice';
  if (hasAggression && hasLeadership) return 'Aggression and Leadership';
  if (hasAggression && hasProtection) return 'Aggression and Protection';
  if (hasJustice && hasLeadership) return 'Justice and Leadership';
  if (hasJustice && hasProtection) return 'Justice and Protection';
  if (hasLeadership && hasProtection) return 'Leadership and Protection';
  if (hasAggression && hasBasic) return 'Aggression and Pool';
  if (hasJustice && hasBasic) return 'Justice and Pool';
  if (hasLeadership && hasBasic) return 'Leadership and Pool';
  if (hasProtection && hasBasic) return 'Pool and Protection';

  // Fallback - return the original if we can't map it
  console.warn(`  Warning: Could not map Spider-Woman aspects: ${aspect}`);
  return aspect;
}

/**
 * Parse difficulty string (e.g., "S1E1", "S2", "Heroic") into form selections
 */
export function parseDifficulty(difficulty: string): DifficultySettings {
  const result: DifficultySettings = {
    standard: 'Standard (Core Set)',
    expert: 'None',
    heroic: '',
    skirmish: ''
  };

  if (difficulty === 'Heroic') {
    result.heroic = '1'; // Default to Heroic 1
    return result;
  }

  // Parse standard level
  if (difficulty.includes('S3')) {
    result.standard = 'Standard III (Age of Apocalypse campaign box)';
  } else if (difficulty.includes('S2')) {
    result.standard = 'Standard II (The Hood scenario pack)';
  } else {
    result.standard = 'Standard (Core Set)';
  }

  // Parse expert level
  if (difficulty.includes('E2')) {
    result.expert = 'Expert II (The Hood scenario pack)';
  } else if (difficulty.includes('E1')) {
    result.expert = 'Expert (Core Set)';
  }

  return result;
}
