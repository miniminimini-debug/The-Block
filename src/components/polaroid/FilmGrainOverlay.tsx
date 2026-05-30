import { View, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';

interface FilmGrainOverlayProps {
  opacity?: number;
  style?: ViewStyle;
  animated?: boolean;
}

/**
 * Produces a subtle film-grain texture overlay using a repeating dot pattern.
 * opacity: 0.06–0.12 for developed state, 0.25+ for developing/sepia state.
 */
export function FilmGrainOverlay({ opacity = 0.08, style, animated = false }: FilmGrainOverlayProps) {
  const dots = Array.from({ length: 200 }, (_, i) => ({
    x: `${(Math.sin(i * 137.508 + 1) * 0.5 + 0.5) * 100}%`,
    y: `${(Math.cos(i * 137.508 + 2) * 0.5 + 0.5) * 100}%`,
    size: (Math.sin(i * 23.1 + 3) * 0.5 + 0.5) * 1.8 + 0.4,
    localOpacity: (Math.sin(i * 57.3 + 4) * 0.5 + 0.5) * 0.7 + 0.3,
  }));

  const content = (
    <View
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
        style,
      ]}
      pointerEvents="none"
    >
      {dots.map((dot, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: dot.x as any,
            top: dot.y as any,
            width: dot.size,
            height: dot.size,
            borderRadius: dot.size,
            backgroundColor: '#000',
            opacity: opacity * dot.localOpacity,
          }}
        />
      ))}
    </View>
  );

  if (animated) {
    return (
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      >
        {content}
      </MotiView>
    );
  }

  return content;
}
