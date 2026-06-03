import { useState, useEffect, useCallback } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "midnight" | "ember";

const THEME_KEY = "task_battles_theme";

export function useTheme() {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === "midnight" || val === "ember") {
        setModeState(val);
      }
      setLoaded(true);
    });
  }, []);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  const effectiveScheme =
    mode === "midnight" ? "dark" : mode === "ember" ? "dark" : systemScheme ?? "light";

  const themeName = mode;

  return { mode, setMode, effectiveScheme, themeName, loaded };
}
