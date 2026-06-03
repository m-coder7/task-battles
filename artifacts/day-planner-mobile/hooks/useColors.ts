import colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";

export function useColors() {
  const { effectiveScheme, themeName } = useTheme();

  let palette = colors.light;
  if (themeName === "ember" && "ember" in colors) {
    palette = (colors as unknown as Record<string, typeof colors.light>).ember;
  } else if (effectiveScheme === "dark" && "dark" in colors) {
    palette = (colors as unknown as Record<string, typeof colors.light>).dark;
  }

  return { ...palette, radius: colors.radius };
}
