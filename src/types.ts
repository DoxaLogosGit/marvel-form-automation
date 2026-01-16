// Types for play data

export interface HeroPlay {
  Hero: string;
  Aspect: string;
  Win: number;
}

export interface PlayData {
  Id: string;
  Date: string;
  Villain: string;
  Difficulty: string;
  Multiplayer: boolean;
  True_Solo: boolean;
  Heroes: HeroPlay[];
  Modular_Sets: string[];
}

export interface DifficultySettings {
  standard: string;
  expert: string;
  heroic: string;
  skirmish: string;
}

export interface ProcessingResult {
  success: number;
  failed: number;
}
