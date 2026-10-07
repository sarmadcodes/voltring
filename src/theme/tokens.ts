export const colors = {
  background: '#06060B',
  surface: '#0E0E18',
  surfaceRaised: '#151524',
  line: '#24243A',
  primary: '#3CF0FF',
  primaryDim: '#1B6F7A',
  secondary: '#B26BFF',
  accent: '#FF3DB8',
  success: '#5CFF9D',
  danger: '#FF4D6A',
  gold: '#FFD25C',
  text: '#ECEEFF',
  textMuted: '#8A8CA8',
  textFaint: '#55576E',
  onPrimary: '#04141A',
} as const;

export const fonts = {
  display: 'Orbitron_800ExtraBold',
  displayHeavy: 'Orbitron_900Black',
  // Orbitron's slashed zero reads as a crossed box at score sizes; Chakra Petch digits stay crisp.
  number: 'ChakraPetch_700Bold',
  ui: 'ChakraPetch_500Medium',
  uiBold: 'ChakraPetch_700Bold',
} as const;

/** One radius system: everything is nearly square, which reads as arcade hardware. */
export const radius = { sm: 2, md: 4 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

/** Colored glow via RN's boxShadow (supported on Android new architecture). */
export function glow(color: string, blur = 18, spread = 0): string {
  return `0 0 ${blur}px ${spread}px ${color}`;
}

export const textGlow = (color: string, radiusPx = 12) => ({
  textShadowColor: color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: radiusPx,
});
