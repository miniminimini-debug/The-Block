import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Atmosphere } from '../lib/atmosphere';

export interface WindowConfig {
  lit: boolean;
  color: string;
  userActive?: boolean;
  mood?: string;
}

interface WindowProps {
  config: WindowConfig;
  atmosphere: Atmosphere;
  size?: number;
  delay?: number;
}

// Single animated window
export function Window({ config, atmosphere, size = 16, delay = 0 }: WindowProps) {
  const glowIntensity = config.lit ? atmosphere.buildingGlow : 0.08;
  const animateIntensity = config.lit ? [0.6, 0.95, 0.6] : [0.08, 0.12, 0.08];

  return (
    <MotiView
      animate={{ opacity: animateIntensity }}
      transition={{
        type: 'timing',
        duration: 3000 + Math.random() * 2000,
        loop: true,
        delay,
      }}
      style={{
        width: size,
        height: size,
        borderRadius: 2,
        backgroundColor: config.color,
        shadowColor: config.color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: glowIntensity,
        shadowRadius: config.lit ? 8 : 3,
        elevation: config.lit ? 12 : 3,
      }}
    />
  );
}

interface BuildingProps {
  width: number;
  height: number;
  color: string;
  windows: WindowConfig[][];
  atmosphere: Atmosphere;
  isUserBuilding?: boolean;
  friendName?: string;
}

// Building with glowing windows grid
export function Building({
  width,
  height,
  color,
  windows,
  atmosphere,
  isUserBuilding = false,
  friendName,
}: BuildingProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      style={{
        width,
        height,
        backgroundColor: color,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        paddingTop: 10,
        paddingHorizontal: 8,
        overflow: 'hidden',
        gap: 5,
        borderLeftWidth: isUserBuilding ? 2 : 0,
        borderLeftColor: isUserBuilding ? atmosphere.accentColor : undefined,
      }}
    >
      {/* Windows grid */}
      <View style={{ gap: 5 }}>
        {windows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
            {row.map((win, wi) => (
              <Window
                key={`${ri}-${wi}`}
                config={win}
                atmosphere={atmosphere}
                size={14}
                delay={(ri * 3 + wi * 2) * 100}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Glow beneath building when windows are lit */}
      {windows.some((row) => row.some((w) => w.lit)) && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: atmosphere.buildingGlow * 0.3 }}
          transition={{ type: 'timing', duration: 1000 }}
          style={{
            position: 'absolute',
            bottom: -20,
            left: 0,
            right: 0,
            height: 40,
            backgroundColor: color,
            opacity: 0.15,
            filter: undefined,
          }}
        />
      )}
    </MotiView>
  );
}

// Create window grid from friend activity
export function createWindowGrid(
  cols: number,
  rows: number,
  friendData: { isActive: boolean; hasMood: boolean }
): WindowConfig[][] {
  const grid: WindowConfig[][] = [];
  const totalWindows = cols * rows;
  let windowIndex = 0;

  for (let r = 0; r < rows; r++) {
    const row: WindowConfig[] = [];
    for (let c = 0; c < cols; c++) {
      const windowLit = windowIndex === 0 || (friendData.isActive && windowIndex < cols);
      row.push({
        lit: windowLit || Math.random() > 0.6,
        color: windowLit ? '#E09600' : '#A99BFF',
        userActive: windowIndex === 0,
      });
      windowIndex++;
    }
    grid.push(row);
  }

  return grid;
}
