import { join } from "node:path"
import { homedir } from "node:os"
import { existsSync, readdirSync } from "node:fs"
import { execSync } from "node:child_process"
import { readFile } from "node:fs/promises"

function getFontDir(): string {
  return process.platform === "darwin"
    ? join(homedir(), "Library", "Fonts")
    : join(homedir(), ".local", "share", "fonts")
}

export function isNerdFontInstalled(): boolean {
  const dir = getFontDir()
  if (!existsSync(dir)) return false
  return readdirSync(dir).some(
    f => f.includes("NerdFont") || f.includes("Nerd")
  )
}

export async function installNerdFont(): Promise<{ success: boolean, message: string }> {
  try {
    execSync(
      `nerd_font_name="JetBrainsMono" bash <(curl -fsSL https://raw.githubusercontent.com/monoira/nefoin/main/install.sh)`,
      { stdio: "pipe", timeout: 60000 }
    )
    try {
      execSync("fc-cache -f", { stdio: "pipe" })
    }
    catch {
      //fc-cache might not exist on mac
    }
    return { success: true, message: "Pi-Review-Panel: Nerd Fonts installed, successfully" }
  }
  catch {
    return { success: false, message: "Pi-Review-Panel: Something went wrong, Try installing nerd fonts manually" }
  }
}

const TERMINAL_DETECTORS: Array<{ name: string; detect: () => boolean }> = [
  {
    name: "ghostty",
    detect: () => !!(process.env.GHOSTTY_RESOURCES_DIR || process.env.TERM?.includes("ghostty")),
  },
  {
    name: "kitty",
    detect: () => !!(process.env.KITTY_PID || process.env.TERM_PROGRAM?.includes("kitty")),
  },
  {
    name: "alacritty",
    detect: () => !!(process.env.ALACRITTY_SOCKET || process.env.TERM?.includes("alacritty")),
  },
  {
    name: "windows-terminal",
    detect: () => !!(process.env.WT_SESSION || process.env.WT_PROFILE_ID),
  },
  {
    name: "wezterm",
    detect: () => !!(process.env.WEZTERM_PTY || process.env.TERM_PROGRAM?.includes("wezterm")),
  },
  {
    name: "warp",
    detect: () => !!process.env.TERM_PROGRAM?.includes("warp"),
  },
  {
    name: "iterm2",
    detect: () => !!process.env.TERM_PROGRAM?.includes("iTerm"),
  },
  {
    name: "terminal",
    detect: () => process.env.TERM_PROGRAM === "Apple_Terminal",
  },
  {
    name: "gnome-terminal",
    detect: () => {
      const vteVersion = parseInt(process.env.VTE_VERSION || "0", 10)
      return !!(process.env.TERM_PROGRAM?.includes("gnome-terminal") || vteVersion >= 3803)
    },
  },
  {
    name: "konsole",
    detect: () => !!process.env.TERM_PROGRAM?.includes("konsole"),
  },
]

const TERMINAL_INSTRUCTIONS: Record<string, string> = {
  ghostty: [
    "Set your terminal font to see icons:",
    "1. Open ~/.config/ghostty/config.ghostty",
    "2. Add this line:",
    '   font-family = "JetBrainsMono Nerd Font"',
    "3. Restart Ghostty",
  ].join("\n"),
  kitty: [
    "Set your terminal font to see icons:",
    "1. Open ~/.config/kitty/kitty.conf",
    "2. Add this line:",
    "   font_family JetBrainsMono Nerd Font",
    "3. Reload: ctrl+shift+f5",
  ].join("\n"),
  alacritty: [
    "Set your terminal font to see icons:",
    "1. Open ~/.config/alacritty/alacritty.toml",
    "2. Add under [font]:",
    '   normal.family = "JetBrainsMono Nerd Font"',
    "3. Save — Alacritty auto-reloads",
  ].join("\n"),
  "windows-terminal": [
    "Set your terminal font to see icons:",
    "1. Open Windows Terminal Settings (Ctrl+,)",
    "2. Go to Profiles → Defaults → Appearance",
    "3. Set Font face to: 'JetBrainsMono Nerd Font'",
    "4. Save",
  ].join("\n"),
  wezterm: [
    "Set your terminal font to see icons:",
    "1. Open ~/.config/wezterm/wezterm.lua",
    "2. Add: config.font = 'JetBrainsMono Nerd Font'",
    "3. Reload: ctrl+shift+r",
  ].join("\n"),
  warp: [
    "Set your terminal font to see icons:",
    "1. Open Warp",
    "2. Go to Settings → Appearance",
    "3. Set Font to 'JetBrainsMono Nerd Font'",
  ].join("\n"),
  iterm2: [
    "Set your terminal font to see icons:",
    "1. iTerm2 → Preferences → Profiles → Text",
    "2. Click Font → Select 'JetBrainsMono Nerd Font'",
  ].join("\n"),
  terminal: [
    "Set your terminal font to see icons:",
    "1. Terminal → Preferences → Profiles → Text",
    "2. Click Font → Select 'JetBrainsMono Nerd Font'",
  ].join("\n"),
  "gnome-terminal": [
    "Set your terminal font to see icons:",
    "1. Open GNOME Terminal",
    "2. Go to Preferences → Profiles → Text",
    "3. Click Font → Select 'JetBrainsMono Nerd Font'",
  ].join("\n"),
  konsole: [
    "Set your terminal font to see icons:",
    "1. Open Konsole → Settings → Edit Current Profile",
    "2. Go to Appearance → Font",
    "3. Select 'JetBrainsMono Nerd Font'",
  ].join("\n"),
}

const TERMINAL_CONFIG_PATHS: Record<string, string> = {
  ghostty: join(homedir(), ".config", "ghostty", "config.ghostty"),
  kitty: join(homedir(), ".config", "kitty", "kitty.conf"),
  alacritty: join(homedir(), ".config", "alacritty", "alacritty.toml"),
  wezterm: join(homedir(), ".config", "wezterm", "wezterm.lua"),
}

function detectTerminal(): string {
  for (const { name, detect } of TERMINAL_DETECTORS) {
    if (detect()) return name
  }
  return "unknown"
}

export async function isNerdFontConfiguredInTerminal(): Promise<boolean> {
  const terminal = detectTerminal()
  if (!TERMINAL_CONFIG_PATHS[terminal]) return true
  try {
    const content = await readFile(TERMINAL_CONFIG_PATHS[terminal], "utf-8")
    return content.includes("Nerd Font")
  } catch {
    return true
  }
}

export function getTerminalHintForFontConfig(): string {
  const terminal = detectTerminal()
  const instructions = TERMINAL_INSTRUCTIONS[terminal] || "Set your terminal font to 'JetBrainsMono Nerd Font' in your terminal preferences."
  return `Looks like you are using ${terminal}.\n\n${instructions}\n\nYou can learn more at https://github.com/pnpancholi/pi-review-panel`
}
