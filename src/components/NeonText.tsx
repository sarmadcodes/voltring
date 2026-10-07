import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts, textGlow } from '@/theme/tokens';

type Variant = 'title' | 'heading' | 'number' | 'label' | 'body' | 'caption';

const VARIANTS: Record<Variant, TextStyle> = {
  title: { fontFamily: fonts.displayHeavy, fontSize: 44, letterSpacing: 4, color: colors.text },
  heading: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 3, color: colors.text },
  number: { fontFamily: fonts.number, fontSize: 28, letterSpacing: 1, color: colors.text, fontVariant: ['tabular-nums'] },
  label: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 2.5, color: colors.textMuted },
  body: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 22, color: colors.text },
  caption: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: colors.textMuted },
};

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  /** Glow color; omit for flat text. Kept off body copy for readability. */
  glow?: string;
  glowRadius?: number;
}

export function NeonText({ variant = 'body', color, glow, glowRadius = 12, style, ...rest }: Props) {
  return (
    <Text
      maxFontSizeMultiplier={variant === 'title' || variant === 'number' ? 1.2 : 1.6}
      {...rest}
      style={[VARIANTS[variant], color ? { color } : null, glow ? textGlow(glow, glowRadius) : null, style]}
    />
  );
}
