export const quickNoteBranding = {
  displayName: "QuickNote",
  productName: "QuickNote",
  bundleIdentifier: "com.quicknote.app",
  windowsAppUserModelId: "com.quicknote.app",
  icons: {
    sourceSvg: "packages/branding/assets/quicknote-icon.svg",
    macIcns: "apps/mac-host/QuickNoteMacOS/Resources/AppIcon.icns",
    windowsIco: "apps/windows-host/Assets/AppIcon.ico",
  },
} as const;

export type QuickNoteBranding = typeof quickNoteBranding;
