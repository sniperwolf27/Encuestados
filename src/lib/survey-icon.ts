import { Camera, Palette, Headphones, ClipboardList, type LucideIcon } from "lucide-react";

const EMOJI_ICON_MAP: Record<string, LucideIcon> = {
  "📷": Camera,
  "🎨": Palette,
  "🎧": Headphones,
};

export function getSurveyIcon(emoji: string | null): LucideIcon {
  if (emoji && EMOJI_ICON_MAP[emoji]) return EMOJI_ICON_MAP[emoji];
  return ClipboardList;
}
