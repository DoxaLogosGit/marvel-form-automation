import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';

// Types for our play data
interface HeroPlay {
  Hero: string;
  Aspect: string;
  Win: number;
}

interface PlayData {
  Id: string;
  Date: string;
  Villain: string;
  Difficulty: string;
  Multiplayer: boolean;
  True_Solo: boolean;
  Heroes: HeroPlay[];
  Modular_Sets: string[];
}

// Form URL
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdb_5W0QBAF99fG824yF4Dowxh_t5Sii-juH9IbX9rUW5tTdA/viewform';

// Timeout constants
const DEFAULT_TIMEOUT = 10000;
const NAVIGATION_TIMEOUT = 30000;

// Hero name mappings from JSON data to form options
const HERO_NAME_MAPPINGS: Record<string, string> = {
  'Spider Man': 'Spider-Man (Peter Parker)',
  'Spider-Man': 'Spider-Man (Peter Parker)',
  'Black Panther': 'Black Panther (T\'Challa)',
  'Miles Morales': 'Spider-Man (Miles Morales)',
  'Ant Man': 'Ant-Man',
  'Star Lord': 'Star-Lord',
  'Ghost Spider': 'Ghost-Spider',
  'Iron Heart': 'Ironheart',
  'Sp//der': 'SP//dr',
  'Spider Ham': 'Spider-Ham',
  'Spider Woman': 'Spider-Woman',
};

// Spider-Woman dual aspect mappings - she uses two aspects
// Maps JSON values like "Justice & aggression" to form values like "Aggression and Justice"
function mapSpiderWomanAspects(aspect: string): string {
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

// Villain name mappings from JSON data to form options
// The JSON data may have different names than the form
const VILLAIN_NAME_MAPPINGS: Record<string, string> = {
  'The Collector - Infiltrate the Museum': 'Infiltrate the Museum',
  'The Collector - Escape the Museum': 'Escape the Museum',
  'The Hood Villain': 'The Hood',
  'Norman Osborn': 'Risky Business',
  'Green Goblin': 'Mutagen Formula',
  'Green Goblin - Mutagen Formula': 'Mutagen Formula',
  'Green Goblin - Risky Business': 'Risky Business',
  'Amin Zola': 'Zola',
  'Magneto Villain': 'Magneto',
  'Nebula Villain': 'Nebula',
  'Ronan': 'Ronan the Accuser',
  'Sinister Six': 'The Sinister Six',
  'Venom Villain': 'Venom',
  'Magog': 'MaGog',
  'Drang': 'Brotherhood of Badoon',
};

// Scenarios that skip the modular sets page entirely (form handles differently)
const SCENARIOS_WITHOUT_MODULAR_PAGE = new Set([
  'Wrecking Crew',
]);

/**
 * Split an array into roughly equal chunks for parallel processing
 */
function chunkArray<T>(array: T[], numChunks: number): T[][] {
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

class FormSubmitter {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private workerId: number;

  constructor(workerId: number = 0) {
    this.workerId = workerId;
  }

  async initialize() {
    this.browser = await chromium.launch({
      headless: true  // Headless mode for automated testing
    });
    this.page = await this.browser.newPage();
    // Set default timeout
    this.page.setDefaultTimeout(DEFAULT_TIMEOUT);
  }

  /**
   * Get a formatted worker prefix for logging
   */
  private getWorkerPrefix(): string {
    return `[Worker ${this.workerId}]`;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Check if the current page contains a specific section heading
   * Google Forms uses heading elements within generic containers
   */
  async isOnPage(sectionText: string): Promise<boolean> {
    if (!this.page) return false;
    try {
      // Google Forms section headers are in heading elements
      // Use getByRole which is more reliable
      const heading = this.page.getByRole('heading', { name: sectionText });
      const count = await heading.count();
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if we're on the campaign mode question page
   */
  async isOnCampaignPage(): Promise<boolean> {
    if (!this.page) return false;
    try {
      // Look specifically for the campaign mode question
      const campaignQuestion = this.page.getByRole('radiogroup', { name: /Were you playing in campaign mode/i });
      return await campaignQuestion.count() > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if we're on the modular sets page
   */
  async isOnModularSetsPage(): Promise<boolean> {
    if (!this.page) return false;
    try {
      // Look for checkboxes on the page - modular sets page has checkboxes
      const checkboxes = this.page.getByRole('checkbox');
      return await checkboxes.count() > 0;
    } catch {
      return false;
    }
  }

  /**
   * Wait for page to stabilize after navigation
   */
  async waitForPageReady(): Promise<void> {
    if (!this.page) return;
    await this.page.waitForLoadState('networkidle', { timeout: NAVIGATION_TIMEOUT });
    // Small delay to ensure form elements are interactive
    await this.page.waitForTimeout(500);
  }

  /**
   * Get current page section for debugging
   */
  async getCurrentPageSection(): Promise<string> {
    if (!this.page) return 'unknown';
    try {
      // Try to get the first heading on the page
      const heading = this.page.locator('h1, h2, h3, [role="heading"]').first();
      if (await heading.count() > 0) {
        return await heading.textContent() || 'unknown';
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Parse difficulty string (e.g., "S1E1", "S2", "Heroic") into form selections
   */
  parseDifficulty(difficulty: string): {
    standard: string;
    expert: string;
    heroic: string;
    skirmish: string;
  } {
    const result = {
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

  /**
   * Submit a single play to the Google Form
   */
  async submitPlay(play: PlayData): Promise<boolean> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      console.log(`${this.getWorkerPrefix()} Submitting play ${play.Id} - ${play.Date} - ${play.Villain}`);

      // Navigate to form with retry logic
      try {
        await this.page.goto(FORM_URL, { timeout: NAVIGATION_TIMEOUT });
        await this.waitForPageReady();
      } catch (navError) {
        console.error(`  Navigation failed, retrying...`);
        await this.page.waitForTimeout(2000);
        await this.page.goto(FORM_URL, { timeout: NAVIGATION_TIMEOUT });
        await this.waitForPageReady();
      }

      // PAGE 1: Select Hero
      const firstHero = play.Heroes[0];
      // Map hero name if needed (JSON data may have different names than form)
      const heroName = HERO_NAME_MAPPINGS[firstHero.Hero] || firstHero.Hero;
      console.log(`  Selecting hero: ${heroName}${heroName !== firstHero.Hero ? ` (mapped from "${firstHero.Hero}")` : ''}`);

      // Use more specific selector for radio buttons
      const heroRadio = this.page.getByRole('radio', { name: heroName, exact: true });
      if (await heroRadio.count() === 0) {
        // Fallback to partial match
        const heroRadioPartial = this.page.getByRole('radio', { name: heroName });
        await heroRadioPartial.first().click();
      } else {
        await heroRadio.click();
      }

      await this.page.getByRole('button', { name: 'Next' }).click();
      await this.waitForPageReady();

      // PAGE 2: Hero Aspect and Second Hero question
      // Adam Warlock skips the aspect page entirely (he uses all aspects)
      // Spider-Woman has a special dual-aspect page instead of the normal aspect selection
      const isAdamWarlock = heroName === 'Adam Warlock';
      const isSpiderWoman = heroName === 'Spider-Woman';

      if (isAdamWarlock) {
        console.log(`  Adam Warlock: skipping aspect selection (uses all aspects)`);
        // No aspect selection needed - form skips directly to "Was there a second Hero?"
      } else if (isSpiderWoman) {
        const dualAspect = mapSpiderWomanAspects(firstHero.Aspect);
        console.log(`  Selecting Spider-Woman dual aspects: ${dualAspect}${dualAspect !== firstHero.Aspect ? ` (mapped from "${firstHero.Aspect}")` : ''}`);
        await this.page.getByRole('radio', { name: dualAspect }).click();
      } else {
        console.log(`  Selecting aspect: ${firstHero.Aspect}`);
        await this.page.getByRole('radio', { name: firstHero.Aspect }).click();
      }

      // Check if there are additional heroes (for two-handed solo or multiplayer where we track all heroes)
      const hasMoreHeroes = play.Heroes.length > 1 && !play.Multiplayer;

      // Find the "Was there a second Hero?" question and answer it
      const secondHeroQuestion = this.page.getByRole('radiogroup', { name: /Was there a second Hero/i });
      if (hasMoreHeroes) {
        await secondHeroQuestion.getByLabel('Yes').click();
      } else {
        await secondHeroQuestion.getByLabel('No').click();
      }

      await this.page.getByRole('button', { name: 'Next' }).click();
      await this.waitForPageReady();

      // Handle additional heroes (2nd, 3rd, 4th) if present
      if (hasMoreHeroes) {
        for (let i = 1; i < play.Heroes.length; i++) {
          const heroData = play.Heroes[i];
          const ordinal = i === 1 ? 'second' : i === 2 ? 'third' : 'fourth';

          // Select the hero
          const heroName = HERO_NAME_MAPPINGS[heroData.Hero] || heroData.Hero;
          console.log(`  Selecting ${ordinal} hero: ${heroName}${heroName !== heroData.Hero ? ` (mapped from "${heroData.Hero}")` : ''}`);

          const heroRadio = this.page.getByRole('radio', { name: heroName, exact: true });
          if (await heroRadio.count() === 0) {
            const heroRadioPartial = this.page.getByRole('radio', { name: heroName });
            await heroRadioPartial.first().click();
          } else {
            await heroRadio.click();
          }

          await this.page.getByRole('button', { name: 'Next' }).click();
          await this.waitForPageReady();

          // Select the hero's aspect
          console.log(`  Selecting ${ordinal} hero aspect: ${heroData.Aspect}`);
          await this.page.getByRole('radio', { name: heroData.Aspect }).click();

          // Check if there's another hero after this one
          const hasNextHero = i + 1 < play.Heroes.length;
          const nextHeroQuestionName = i === 1 ? /Was there a third Hero/i : /Was there a fourth Hero/i;
          const nextHeroQuestion = this.page.getByRole('radiogroup', { name: nextHeroQuestionName });

          if (await nextHeroQuestion.count() > 0) {
            if (hasNextHero) {
              await nextHeroQuestion.getByLabel('Yes').click();
            } else {
              await nextHeroQuestion.getByLabel('No').click();
            }
          }

          await this.page.getByRole('button', { name: 'Next' }).click();
          await this.waitForPageReady();
        }
      }

      // Scenario selection page
      // PAGE 3 (or later if multiple heroes): Scenario/Villain
      // Map villain name if needed (JSON data may have different names than form)
      const villainName = VILLAIN_NAME_MAPPINGS[play.Villain] || play.Villain;
      console.log(`  Selecting villain: ${villainName}${villainName !== play.Villain ? ` (mapped from "${play.Villain}")` : ''}`);

      const villainRadio = this.page.getByRole('radio', { name: villainName, exact: true });
      if (await villainRadio.count() === 0) {
        // Fallback to partial match
        const villainRadioPartial = this.page.getByRole('radio', { name: villainName });
        await villainRadioPartial.first().click();
      } else {
        await villainRadio.click();
      }

      await this.page.getByRole('button', { name: 'Next' }).click();
      await this.waitForPageReady();

      // Check if we're on the Campaign Scenarios page (conditional page for some villains)
      // Use specific detection for the campaign question
      if (await this.isOnCampaignPage()) {
        console.log(`  Handling campaign page (selecting No for campaign mode)`);

        // Select "No" for "Were you playing in campaign mode?"
        const campaignModeQuestion = this.page.getByRole('radiogroup', { name: /Were you playing in campaign mode/i });
        await campaignModeQuestion.getByLabel('No').click();

        // Note: We don't need to answer "Expert Campaign mode" since we selected No above
        // and it may not be required, but let's click Next regardless

        await this.page.getByRole('button', { name: 'Next' }).click();
        await this.waitForPageReady();
      }

      // PAGE 4: Modular Encounter Sets (skipped for Wrecking Crew)
      const isWreckingCrew = SCENARIOS_WITHOUT_MODULAR_PAGE.has(play.Villain);

      if (!isWreckingCrew) {
        // Verify we're on the modular sets page by looking for checkboxes
        if (!await this.isOnModularSetsPage()) {
          const currentSection = await this.getCurrentPageSection();
          console.error(`  Error: Expected to be on Modular Sets page, but found: "${currentSection}"`);
          return false;
        }

        console.log(`  Selecting ${play.Modular_Sets.length} modular sets`);
        for (const modularSet of play.Modular_Sets) {
          try {
            // Use checkbox role with name matching
            const checkbox = this.page.getByRole('checkbox', { name: modularSet, exact: true });

            if (await checkbox.count() > 0) {
              await checkbox.click();
              console.log(`    ✓ Selected: ${modularSet}`);
            } else {
              // Try partial match
              const partialCheckbox = this.page.getByRole('checkbox', { name: modularSet });
              if (await partialCheckbox.count() > 0) {
                await partialCheckbox.first().click();
                console.log(`    ✓ Selected: ${modularSet} (partial match)`);
              } else {
                console.warn(`    Warning: Could not find modular set "${modularSet}"`);
              }
            }
          } catch (error) {
            console.warn(`    Warning: Error selecting modular set "${modularSet}":`, error instanceof Error ? error.message : error);
          }
        }

        await this.page.getByRole('button', { name: 'Next' }).click();
        await this.waitForPageReady();
      } else {
        console.log(`  Skipping modular sets (Wrecking Crew scenario)`);
      }

      // PAGE 5: Game Difficulty
      const difficulty = this.parseDifficulty(play.Difficulty);

      // Did you win?
      const won = firstHero.Win === 1;
      console.log(`  Win: ${won ? 'Yes' : 'No'}`);

      // Find the win/loss question specifically
      const winQuestion = this.page.getByRole('radiogroup', { name: /Did you win/i });
      if (won) {
        await winQuestion.getByLabel('Yes').click();
      } else {
        await winQuestion.getByLabel('No').click();
      }

      // Difficulty selection differs for Wrecking Crew vs other scenarios
      if (isWreckingCrew) {
        // Wrecking Crew has special difficulty options:
        // - "Standard (version-A Villains)"
        // - "Expert (version-B Villains)"
        // - "Extreme (two-stage villains, A+B)"
        // - "Custom (a mix of A and B within one game)"
        let wreckingCrewDifficulty = 'Standard (version-A Villains)';
        if (play.Difficulty.includes('E') || play.Difficulty.toLowerCase().includes('expert')) {
          wreckingCrewDifficulty = 'Expert (version-B Villains)';
        }
        console.log(`  Wrecking Crew difficulty: ${wreckingCrewDifficulty}`);
        await this.page.getByRole('radio', { name: wreckingCrewDifficulty }).click();

        // Heroic mode (if applicable) - Wrecking Crew also has this option
        if (difficulty.heroic) {
          console.log(`  Heroic: ${difficulty.heroic}`);
          const heroicQuestion = this.page.getByRole('radiogroup', { name: /Heroic mode/i });
          await heroicQuestion.getByRole('radio', { name: difficulty.heroic, exact: true }).click();
        }
      } else {
        // Standard scenarios with Standard/Expert set selection
        // Standard set
        console.log(`  Standard: ${difficulty.standard}`);
        await this.page.getByRole('radio', { name: difficulty.standard }).click();

        // Expert set
        console.log(`  Expert: ${difficulty.expert}`);
        await this.page.getByRole('radio', { name: difficulty.expert }).click();

        // Heroic mode (if applicable)
        if (difficulty.heroic) {
          console.log(`  Heroic: ${difficulty.heroic}`);
          // Use radiogroup context to select the correct option (avoid conflict with Skirmish mode which also has 1,2,3,4 options)
          const heroicQuestion = this.page.getByRole('radiogroup', { name: /Heroic mode/i });
          await heroicQuestion.getByRole('radio', { name: difficulty.heroic, exact: true }).click();
        }

        // Note: Skirmish mode not implemented as it's not in the current data format
      }

      console.log(`${this.getWorkerPrefix()}   Form filled successfully!`);

      // Submit the form
      await this.page.getByRole('button', { name: 'Submit' }).click();
      await this.waitForPageReady();
      console.log(`${this.getWorkerPrefix()}   ✓ Form submitted successfully!`);

      return true;

    } catch (error) {
      console.error(`${this.getWorkerPrefix()} Error submitting play ${play.Id}:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Process a chunk of plays (used for parallel processing)
   * @param plays Array of plays to process
   * @param chunkIndex Index of this chunk (for logging)
   * @param totalChunks Total number of chunks (for logging)
   */
  async processPlaysChunk(plays: PlayData[], chunkIndex: number, totalChunks: number): Promise<{ success: number; failed: number }> {
    console.log(`${this.getWorkerPrefix()} Starting to process ${plays.length} plays (chunk ${chunkIndex + 1}/${totalChunks})`);

    let successCount = 0;
    let failureCount = 0;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;

    for (const play of plays) {
      // Check if we've had too many consecutive failures (likely browser/connection issue)
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`${this.getWorkerPrefix()} Too many consecutive failures (${consecutiveFailures}). Attempting browser recovery...`);
        try {
          // Try to recover by closing and reopening the page
          if (this.page) {
            await this.page.close().catch(() => {});
          }
          this.page = await this.browser!.newPage();
          this.page.setDefaultTimeout(DEFAULT_TIMEOUT);
          consecutiveFailures = 0;
          console.log(`${this.getWorkerPrefix()} Browser recovered. Continuing...`);
          await this.page.waitForTimeout(2000);
        } catch (recoveryError) {
          console.error(`${this.getWorkerPrefix()} Failed to recover browser. Stopping this worker.`);
          break;
        }
      }

      const success = await this.submitPlay(play);
      if (success) {
        successCount++;
        consecutiveFailures = 0;
        // Wait a bit between submissions to avoid rate limiting
        await this.page!.waitForTimeout(2000);
      } else {
        failureCount++;
        consecutiveFailures++;
        // Wait longer after a failure
        await this.page!.waitForTimeout(3000);
      }
    }

    console.log(`${this.getWorkerPrefix()} Completed chunk ${chunkIndex + 1}/${totalChunks}: ${successCount} successful, ${failureCount} failed`);
    return { success: successCount, failed: failureCount };
  }

  /**
   * Process all plays from the JSON file
   * @param jsonPath Path to the JSON file
   * @param startDate Optional start date (YYYY-MM-DD). Only plays on or after this date will be processed.
   */
  async processPlays(jsonPath: string, startDate?: string) {
    // Read the JSON file
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const allPlays: PlayData[] = JSON.parse(jsonData);

    console.log(`Loaded ${allPlays.length} plays from ${jsonPath}`);

    // Filter plays
    let filteredPlays = allPlays;
    let skippedEmptyModular = 0;
    let skippedBeforeDate = 0;
    let skippedBasicAspect = 0;

    // Filter out plays with "Basic" aspect (no aspect - form requires an aspect selection)
    const playsWithAspect = filteredPlays.filter(play => {
      if (play.Heroes && play.Heroes.some((h: { Aspect: string }) => h.Aspect === 'Basic')) {
        skippedBasicAspect++;
        return false;
      }
      return true;
    });
    filteredPlays = playsWithAspect;

    // Filter out plays with empty modular sets (unless it's a scenario that doesn't use modulars)
    const playsWithModular = filteredPlays.filter(play => {
      // Scenarios like Wrecking Crew don't use modular sets, so don't filter them out
      if (SCENARIOS_WITHOUT_MODULAR_PAGE.has(play.Villain)) {
        return true;
      }
      if (!play.Modular_Sets || play.Modular_Sets.length === 0) {
        skippedEmptyModular++;
        return false;
      }
      return true;
    });
    filteredPlays = playsWithModular;

    // Filter by start date if provided
    if (startDate) {
      const startDateObj = new Date(startDate);
      const playsAfterDate = filteredPlays.filter(play => {
        const playDate = new Date(play.Date);
        if (playDate < startDateObj) {
          skippedBeforeDate++;
          return false;
        }
        return true;
      });
      filteredPlays = playsAfterDate;
    }

    // Sort plays by date (oldest first) so we process chronologically
    const playsToProcess = filteredPlays.sort((a, b) => {
      return new Date(a.Date).getTime() - new Date(b.Date).getTime();
    });

    // Print filtering summary
    console.log(`\n=== Filtering Summary ===`);
    console.log(`Total plays in file: ${allPlays.length}`);
    if (skippedBasicAspect > 0) {
      console.log(`Skipped (Basic/no aspect): ${skippedBasicAspect}`);
    }
    if (skippedEmptyModular > 0) {
      console.log(`Skipped (empty modular sets): ${skippedEmptyModular}`);
    }
    if (startDate) {
      console.log(`Start date filter: ${startDate}`);
      console.log(`Skipped (before start date): ${skippedBeforeDate}`);
    }
    console.log(`Plays to process: ${playsToProcess.length}\n`);

    let successCount = 0;
    let failureCount = 0;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;

    for (const play of playsToProcess) {
      // Check if we've had too many consecutive failures (likely browser/connection issue)
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`\n⚠️  Too many consecutive failures (${consecutiveFailures}). Attempting browser recovery...`);
        try {
          // Try to recover by closing and reopening the page
          if (this.page) {
            await this.page.close().catch(() => {});
          }
          this.page = await this.browser!.newPage();
          this.page.setDefaultTimeout(DEFAULT_TIMEOUT);
          consecutiveFailures = 0;
          console.log('  Browser recovered. Continuing...');
          await this.page.waitForTimeout(2000);
        } catch (recoveryError) {
          console.error('  Failed to recover browser. Stopping.');
          break;
        }
      }

      const success = await this.submitPlay(play);
      if (success) {
        successCount++;
        consecutiveFailures = 0;
        // Wait a bit between submissions to avoid rate limiting
        await this.page!.waitForTimeout(2000);
      } else {
        failureCount++;
        consecutiveFailures++;
        // Wait longer after a failure
        await this.page!.waitForTimeout(3000);
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total plays processed: ${playsToProcess.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
  }
}

/**
 * Process plays in parallel using multiple browser instances
 * @param jsonPath Path to the JSON file
 * @param startDate Optional start date (YYYY-MM-DD). Only plays on or after this date will be processed.
 * @param maxWorkers Maximum number of parallel workers (default: 8)
 */
async function processPlaysInParallel(jsonPath: string, startDate?: string, maxWorkers: number = 8) {
  // Read the JSON file
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const allPlays: PlayData[] = JSON.parse(jsonData);

  console.log(`Loaded ${allPlays.length} plays from ${jsonPath}`);

  // Filter plays
  let filteredPlays = allPlays;
  let skippedEmptyModular = 0;
  let skippedBeforeDate = 0;
  let skippedBasicAspect = 0;

  // Filter out plays with "Basic" aspect (no aspect - form requires an aspect selection)
  const playsWithAspect = filteredPlays.filter(play => {
    if (play.Heroes && play.Heroes.some((h: { Aspect: string }) => h.Aspect === 'Basic')) {
      skippedBasicAspect++;
      return false;
    }
    return true;
  });
  filteredPlays = playsWithAspect;

  // Filter out plays with empty modular sets (unless it's a scenario that doesn't use modulars)
  const playsWithModular = filteredPlays.filter(play => {
    // Scenarios like Wrecking Crew don't use modular sets, so don't filter them out
    if (SCENARIOS_WITHOUT_MODULAR_PAGE.has(play.Villain)) {
      return true;
    }
    if (!play.Modular_Sets || play.Modular_Sets.length === 0) {
      skippedEmptyModular++;
      return false;
    }
    return true;
  });
  filteredPlays = playsWithModular;

  // Filter by start date if provided
  if (startDate) {
    const startDateObj = new Date(startDate);
    const playsAfterDate = filteredPlays.filter(play => {
      const playDate = new Date(play.Date);
      if (playDate < startDateObj) {
        skippedBeforeDate++;
        return false;
      }
      return true;
    });
    filteredPlays = playsAfterDate;
  }

  // Sort plays by date (oldest first) so we process chronologically
  const playsToProcess = filteredPlays.sort((a, b) => {
    return new Date(a.Date).getTime() - new Date(b.Date).getTime();
  });

  // Print filtering summary
  console.log(`\n=== Filtering Summary ===`);
  console.log(`Total plays in file: ${allPlays.length}`);
  if (skippedBasicAspect > 0) {
    console.log(`Skipped (Basic/no aspect): ${skippedBasicAspect}`);
  }
  if (skippedEmptyModular > 0) {
    console.log(`Skipped (empty modular sets): ${skippedEmptyModular}`);
  }
  if (startDate) {
    console.log(`Start date filter: ${startDate}`);
    console.log(`Skipped (before start date): ${skippedBeforeDate}`);
  }
  console.log(`Plays to process: ${playsToProcess.length}`);

  // Determine optimal number of workers
  const numWorkers = Math.min(maxWorkers, playsToProcess.length);
  console.log(`Using ${numWorkers} parallel workers\n`);

  if (numWorkers === 0) {
    console.log('No plays to process.');
    return;
  }

  // Split plays into chunks for parallel processing
  const chunks = chunkArray(playsToProcess, numWorkers);

  // Create workers and initialize them
  const workers: FormSubmitter[] = [];
  console.log('Initializing workers...');
  for (let i = 0; i < numWorkers; i++) {
    const worker = new FormSubmitter(i + 1);
    await worker.initialize();
    workers.push(worker);
    console.log(`  Worker ${i + 1} initialized`);
  }

  console.log('\nStarting parallel processing...\n');

  // Process all chunks in parallel
  const startTime = Date.now();
  const results = await Promise.all(
    chunks.map((chunk, index) =>
      workers[index].processPlaysChunk(chunk, index, numWorkers)
    )
  );

  // Close all workers
  console.log('\nClosing workers...');
  await Promise.all(workers.map(worker => worker.close()));

  // Aggregate results
  const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Print final summary
  console.log(`\n=== Final Summary ===`);
  console.log(`Total plays processed: ${playsToProcess.length}`);
  console.log(`Successful: ${totalSuccess}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Time elapsed: ${elapsedTime} seconds`);
  console.log(`Average time per play: ${(parseFloat(elapsedTime) / playsToProcess.length).toFixed(2)} seconds`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let jsonPath: string | undefined;
  let startDate: string | undefined;
  let maxWorkers = 8;
  let useParallel = true;

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--sequential' || arg === '-s') {
      useParallel = false;
    } else if (arg === '--workers' || arg === '-w') {
      maxWorkers = parseInt(args[++i], 10);
      if (isNaN(maxWorkers) || maxWorkers < 1) {
        console.error('Error: Invalid number of workers');
        process.exit(1);
      }
    } else if (i === 0 && !arg.startsWith('-')) {
      jsonPath = arg;
    } else if (i === 1 && !arg.startsWith('-')) {
      startDate = arg;
    }
  }

  console.log('Marvel Champions Form Automation');
  console.log('=================================\n');
  console.log('Usage: bun start <json-path> [start-date] [options]');
  console.log('  json-path  : Path to JSON file (required)');
  console.log('  start-date : Only process plays on or after this date (YYYY-MM-DD format)');
  console.log('               If not specified, all plays will be processed');
  console.log('\nOptions:');
  console.log('  --sequential, -s    : Process plays sequentially (default: parallel)');
  console.log('  --workers N, -w N   : Number of parallel workers (default: 8, max: 8)\n');

  // Validate required arguments
  if (!jsonPath) {
    console.error('Error: json-path is required');
    process.exit(1);
  }

  try {
    if (useParallel) {
      console.log(`Mode: Parallel processing with up to ${maxWorkers} workers\n`);
      await processPlaysInParallel(jsonPath, startDate, maxWorkers);
    } else {
      console.log('Mode: Sequential processing\n');
      const submitter = new FormSubmitter(1);
      await submitter.initialize();
      await submitter.processPlays(jsonPath, startDate);
      await submitter.close();
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
