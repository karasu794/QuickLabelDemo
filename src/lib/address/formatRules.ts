export const ADDRESS_FORMAT_RULES: Record<string, string[]> = {
  GB: ['name', 'company', 'line1', 'line2?', 'city', 'county?', 'postal', 'UNITED KINGDOM (GB)'],
  US: ['name', 'company', 'line1', 'line2?', 'city', 'state', 'postal', 'UNITED STATES (US)'],
  // JPは郵便番号を先頭に
  JP: ['postal', 'name', 'company', 'state', 'city', 'line1', 'line2?', 'JAPAN (JP)'],
}


