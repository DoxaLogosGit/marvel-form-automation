// Constants and mappings for form automation

// Form URL
export const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdb_5W0QBAF99fG824yF4Dowxh_t5Sii-juH9IbX9rUW5tTdA/viewform';

// Timeout constants
export const DEFAULT_TIMEOUT = 10000;
export const NAVIGATION_TIMEOUT = 30000;

// Hero name mappings from JSON data to form options
export const HERO_NAME_MAPPINGS: Record<string, string> = {
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

// Villain name mappings from JSON data to form options
export const VILLAIN_NAME_MAPPINGS: Record<string, string> = {
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
export const SCENARIOS_WITHOUT_MODULAR_PAGE = new Set([
  'Wrecking Crew',
]);
