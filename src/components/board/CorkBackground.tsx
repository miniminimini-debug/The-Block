import { View, StyleSheet } from 'react-native';

const CORK_DARK = Array.from({ length: 130 }, (_, i) => ({
  x:  (Math.sin(i * 127.1 + 1.5) * 0.5 + 0.5) * 100,
  y:  (Math.cos(i * 311.7 + 0.3) * 0.5 + 0.5) * 100,
  w:  (Math.sin(i * 23.5)  * 0.5 + 0.5) * 16 + 4,
  h:  (Math.cos(i * 41.7)  * 0.5 + 0.5) * 10 + 3,
  op: (Math.sin(i * 67.3)  * 0.5 + 0.5) * 0.30 + 0.12,
}));

const CORK_LIGHT = Array.from({ length: 90 }, (_, i) => ({
  x:  (Math.cos(i * 97.3  + 2.2) * 0.5 + 0.5) * 100,
  y:  (Math.sin(i * 213.1 + 0.8) * 0.5 + 0.5) * 100,
  w:  (Math.cos(i * 19.1) * 0.5 + 0.5) * 14 + 5,
  h:  (Math.sin(i * 33.3) * 0.5 + 0.5) *  8 + 3,
  op: (Math.sin(i * 51.7) * 0.5 + 0.5) * 0.22 + 0.08,
}));

export function CorkBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#C4935A', overflow: 'hidden' }]}>
      {CORK_DARK.map((g, i) => (
        <View key={`d${i}`} style={{
          position: 'absolute',
          left: `${g.x}%` as any, top: `${g.y}%` as any,
          width: g.w, height: g.h,
          borderRadius: Math.min(g.w, g.h) * 0.5,
          backgroundColor: '#7A3E10',
          opacity: g.op,
        }} />
      ))}
      {CORK_LIGHT.map((g, i) => (
        <View key={`l${i}`} style={{
          position: 'absolute',
          left: `${g.x}%` as any, top: `${g.y}%` as any,
          width: g.w, height: g.h,
          borderRadius: Math.min(g.w, g.h) * 0.5,
          backgroundColor: '#E8B870',
          opacity: g.op,
        }} />
      ))}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(100,55,10,0.06)' }]} />
    </View>
  );
}
