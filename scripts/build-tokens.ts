// Build script: compiles JSON design tokens into SCSS custom properties.
// Runs via ts-node, outside the app bundle.
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TOKENS_DIR = resolve(__dirname, '../src/styles/tokens');
const OUTPUT_FILE = resolve(__dirname, '../src/styles/core/_tokens.scss');

interface ColorTokens {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  primary: string;
  primaryContrast: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  oat: string;
  clay: string;
  tabInactive: string;
  authBackground: string;
  authText: string;
  error: string;
  errorHover: string;
  success: string;
  warning: string;
  canvas: string;
  thread: string;
  skin: Record<string, string>;
  eye: Record<string, string>;
  hair: Record<string, string>;
  season: Record<string, string[]>;
}

interface SpacingTokens {
  base: string;
  scale: number[];
}

interface TypographyTokens {
  fontFamily: { base: string; display: string; mono: string };
  fontSize: Record<string, string | number>;
  fontWeight: Record<string, string | number>;
  lineHeight: Record<string, string | number>;
  letterSpacing: Record<string, string | number>;
}

type FlatTokens = Record<string, string | number>;

function readJson<T>(filename: string): T {
  const content = readFileSync(resolve(TOKENS_DIR, filename), 'utf-8');
  return JSON.parse(content) as T;
}

function main() {
  console.log('🔨 Building design tokens...');

  const colors = readJson<ColorTokens>('colors.json');
  const spacing = readJson<SpacingTokens>('spacing.json');
  const typography = readJson<TypographyTokens>('typography.json');
  const radius = readJson<FlatTokens>('radius.json');
  const shadows = readJson<FlatTokens>('shadows.json');
  const breakpoints = readJson<FlatTokens>('breakpoints.json');
  const zIndex = readJson<FlatTokens>('zIndex.json');
  const durations = readJson<FlatTokens>('durations.json');
  const easings = readJson<FlatTokens>('easings.json');
  const touchTargets = readJson<FlatTokens>('touchTargets.json');
  const layout = readJson<FlatTokens>('layout.json');

  // Helper to convert camelCase to kebab-case for CSS custom properties
  function toKebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  // Build spacing scale - use actual scale values from JSON as token suffixes (not array indices)
  const baseSpace = parseFloat(spacing.base);
  const spaceTokens: string[] = [];
  spacing.scale.forEach((n: number) => {
    spaceTokens.push(`--space-${n}: ${n * baseSpace}rem;`);
  });

  const lines: string[] = [];

  // Colors
  lines.push('  /* Colors */');
  lines.push(`--color-background: ${colors.background};`);
  lines.push(`--color-surface: ${colors.surface};`);
  lines.push(`--color-foreground: ${colors.foreground};`);
  lines.push(`--color-muted: ${colors.muted};`);
  lines.push(`--color-border: ${colors.border};`);
  lines.push(`--color-primary: ${colors.primary};`);
  lines.push(`--color-primary-contrast: ${colors.primaryContrast};`);
  lines.push(`--color-accent: ${colors.accent};`);
  lines.push(`--color-accent-hover: ${colors.accentHover};`);
  lines.push(`--color-accent-light: ${colors.accentLight};`);
  lines.push(`--color-oat: ${colors.oat};`);
  lines.push(`--color-clay: ${colors.clay};`);
  lines.push(`--color-tab-inactive: ${colors.tabInactive};`);
  lines.push(`--color-auth-background: ${colors.authBackground};`);
  lines.push(`--color-auth-text: ${colors.authText};`);
  lines.push(`--color-error: ${colors.error};`);
  lines.push(`--color-error-hover: ${colors.errorHover};`);
  lines.push(`--color-success: ${colors.success};`);
  lines.push(`--color-warning: ${colors.warning};`);
  lines.push(`--color-canvas: ${colors.canvas};`);
  lines.push(`--thread-color: ${colors.thread};`);

  // Skin tones
  (Object.entries(colors.skin) as [string, string][]).forEach(([key, value]) => {
    lines.push(`--skin-${key}: ${value};`);
  });

  // Eye colors
  (Object.entries(colors.eye) as [string, string][]).forEach(([key, value]) => {
    lines.push(`--eye-${key}: ${value};`);
  });

  // Hair colors
  (Object.entries(colors.hair) as [string, string][]).forEach(([key, value]) => {
    lines.push(`--hair-${key}: ${value};`);
  });

  // Seasonal palettes
  (Object.entries(colors.season) as [string, string[]][]).forEach(([season, swatches]) => {
    (swatches as string[]).forEach((color: string, index: number) => {
      lines.push(`--season-${season}-${index + 1}: ${color};`);
    });
  });

  // Spacing
  lines.push('\n  /* Spacing */');
  spaceTokens.forEach((token) => {
    lines.push(`  ${token}`);
  });

  // Typography
  lines.push('\n  /* Typography */');
  lines.push(`--font-family-base: ${typography.fontFamily.base};`);
  lines.push(`--font-family-display: ${typography.fontFamily.display};`);
  lines.push(`--font-family-mono: ${typography.fontFamily.mono};`);

  Object.entries(typography.fontSize).forEach(([key, value]) => {
    lines.push(`--font-size-${key}: ${value};`);
  });

  Object.entries(typography.fontWeight).forEach(([key, value]) => {
    lines.push(`--font-weight-${key}: ${value};`);
  });

  Object.entries(typography.lineHeight).forEach(([key, value]) => {
    lines.push(`--line-height-${key}: ${value};`);
  });

  Object.entries(typography.letterSpacing).forEach(([key, value]) => {
    lines.push(`--letter-spacing-${key}: ${value};`);
  });

  // Radius
  lines.push('\n  /* Border Radius */');
  Object.entries(radius).forEach(([key, value]) => {
    lines.push(`--radius-${key}: ${value};`);
  });

  // Shadows
  lines.push('\n  /* Shadows */');
  Object.entries(shadows).forEach(([key, value]) => {
    lines.push(`--shadow-${key}: ${value};`);
  });

  // Breakpoints
  lines.push('\n  /* Breakpoints */');
  Object.entries(breakpoints).forEach(([key, value]) => {
    lines.push(`--breakpoint-${key}: ${value};`);
  });

  // Z-index
  lines.push('\n  /* Z-Index */');
  Object.entries(zIndex).forEach(([key, value]) => {
    lines.push(`--z-${key}: ${value};`);
  });

  // Durations
  lines.push('\n  /* Durations */');
  Object.entries(durations).forEach(([key, value]) => {
    lines.push(`--duration-${key}: ${value};`);
  });

  // Easings
  lines.push('\n  /* Easings */');
  Object.entries(easings).forEach(([key, value]) => {
    lines.push(`--ease-${key}: ${value};`);
  });

  // Touch targets
  lines.push('\n  /* Touch Targets */');
  Object.entries(touchTargets).forEach(([key, value]) => {
    lines.push(`--touch-target-${key}: ${value};`);
  });

  // Layout
  lines.push('\n  /* Layout */');
  Object.entries(layout).forEach(([key, value]) => {
    lines.push(`--${toKebabCase(key)}: ${value};`);
  });

  // Focus ring
  lines.push('\n  /* Focus Ring */');
  lines.push('--focus-ring-width: 2px;');
  lines.push('--focus-ring-offset: 2px;');
  lines.push('--focus-ring-color: var(--color-accent);');

  const scss = `// AUTO-GENERATED - DO NOT EDIT\n// Run 'pnpm tokens:build' to regenerate\n:root {\n${lines.join('\n')}\n}\n`;

  writeFileSync(OUTPUT_FILE, scss);
  console.log('✅ Generated _tokens.scss');
}

main();