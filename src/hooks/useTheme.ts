import { useState, useEffect } from 'react';
import { getTimeOfDay, THEMES, type AppTheme } from '@lib/theme';
import { useThemeOverrideStore } from '@stores/themeOverride.store';

export function useTheme(): AppTheme {
  const override = useThemeOverrideStore((s) => s.override);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDay);

  useEffect(() => {
    const t = setInterval(() => setTimeOfDay(getTimeOfDay()), 60_000);
    return () => clearInterval(t);
  }, []);

  return THEMES[override ?? timeOfDay];
}
