import { Text as RNText, type TextProps } from 'react-native';

type Preset = 'display' | 'title' | 'heading' | 'body' | 'bodyMedium' | 'caption' | 'label';

interface BlockTextProps extends TextProps {
  preset?: Preset;
  children: React.ReactNode;
}

const presetStyles: Record<Preset, object> = {
  display:    { fontFamily: 'Inter_700Bold',    fontSize: 48, letterSpacing: -2,   lineHeight: 56, color: '#EEEEF8' },
  title:      { fontFamily: 'Inter_700Bold',    fontSize: 30, letterSpacing: -0.8, lineHeight: 36, color: '#EEEEF8' },
  heading:    { fontFamily: 'Inter_600SemiBold', fontSize: 24, letterSpacing: -0.5, lineHeight: 30, color: '#EEEEF8' },
  body:       { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22,                      color: '#A0A0C0' },
  bodyMedium: { fontFamily: 'Inter_500Medium',  fontSize: 15, lineHeight: 22,                      color: '#EEEEF8' },
  caption:    { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18,                      color: '#7A7A9A' },
  label:      { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1,   lineHeight: 16, color: '#7A7A9A' },
};

export function BlockText({ preset = 'body', className, style, children, ...rest }: BlockTextProps) {
  return (
    <RNText
      className={className}
      style={[presetStyles[preset], style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
