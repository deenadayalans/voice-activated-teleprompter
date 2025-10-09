// Accent configuration for enhanced speech recognition
export interface AccentConfig {
  language: string
  accent: string
  region: string
  enhancedSettings: {
    maxAlternatives: number
    continuous: boolean
    interimResults: boolean
    confidence: number
  }
}

export const ACCENT_CONFIGS: { [key: string]: AccentConfig } = {
  // Indian English variants
  'en-IN-hindi': {
    language: 'en-IN',
    accent: 'Indian English (Hindi influence)',
    region: 'India',
    enhancedSettings: {
      maxAlternatives: 8,
      continuous: true,
      interimResults: true,
      confidence: 0.7
    }
  },
  'en-IN-tamil': {
    language: 'en-IN',
    accent: 'Indian English (Tamil influence)',
    region: 'India',
    enhancedSettings: {
      maxAlternatives: 8,
      continuous: true,
      interimResults: true,
      confidence: 0.7
    }
  },
  'en-IN-telugu': {
    language: 'en-IN',
    accent: 'Indian English (Telugu influence)',
    region: 'India',
    enhancedSettings: {
      maxAlternatives: 8,
      continuous: true,
      interimResults: true,
      confidence: 0.7
    }
  },

  // British English variants
  'en-GB-rp': {
    language: 'en-GB',
    accent: 'Received Pronunciation',
    region: 'UK',
    enhancedSettings: {
      maxAlternatives: 6,
      continuous: true,
      interimResults: true,
      confidence: 0.8
    }
  },
  'en-GB-cockney': {
    language: 'en-GB',
    accent: 'Cockney',
    region: 'UK',
    enhancedSettings: {
      maxAlternatives: 8,
      continuous: true,
      interimResults: true,
      confidence: 0.6
    }
  },
  'en-GB-scottish': {
    language: 'en-GB',
    accent: 'Scottish English',
    region: 'Scotland',
    enhancedSettings: {
      maxAlternatives: 8,
      continuous: true,
      interimResults: true,
      confidence: 0.6
    }
  },

  // American English variants
  'en-US-general': {
    language: 'en-US',
    accent: 'General American',
    region: 'USA',
    enhancedSettings: {
      maxAlternatives: 5,
      continuous: true,
      interimResults: true,
      confidence: 0.8
    }
  },
  'en-US-southern': {
    language: 'en-US',
    accent: 'Southern American',
    region: 'USA',
    enhancedSettings: {
      maxAlternatives: 7,
      continuous: true,
      interimResults: true,
      confidence: 0.6
    }
  },
  'en-US-african': {
    language: 'en-US',
    accent: 'African American Vernacular',
    region: 'USA',
    enhancedSettings: {
      maxAlternatives: 8,
      continuous: true,
      interimResults: true,
      confidence: 0.6
    }
  },

  // Australian English
  'en-AU': {
    language: 'en-AU',
    accent: 'Australian English',
    region: 'Australia',
    enhancedSettings: {
      maxAlternatives: 7,
      continuous: true,
      interimResults: true,
      confidence: 0.7
    }
  },

  // Canadian English
  'en-CA': {
    language: 'en-CA',
    accent: 'Canadian English',
    region: 'Canada',
    enhancedSettings: {
      maxAlternatives: 6,
      continuous: true,
      interimResults: true,
      confidence: 0.8
    }
  },

  // South African English
  'en-ZA': {
    language: 'en-ZA',
    accent: 'South African English',
    region: 'South Africa',
    enhancedSettings: {
      maxAlternatives: 8,
      continuous: true,
      interimResults: true,
      confidence: 0.6
    }
  },

  // New Zealand English
  'en-NZ': {
    language: 'en-NZ',
    accent: 'New Zealand English',
    region: 'New Zealand',
    enhancedSettings: {
      maxAlternatives: 7,
      continuous: true,
      interimResults: true,
      confidence: 0.7
    }
  }
}

export const getAccentConfig = (accentKey: string): AccentConfig => {
  return ACCENT_CONFIGS[accentKey] || ACCENT_CONFIGS['en-US-general']
}

export const getAvailableAccents = (): string[] => {
  return Object.keys(ACCENT_CONFIGS)
}

export const getAccentsByRegion = (region: string): AccentConfig[] => {
  return Object.values(ACCENT_CONFIGS).filter(config => config.region === region)
}
