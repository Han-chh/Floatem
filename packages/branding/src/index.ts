export const stickItBranding = {
  displayName: "StickIt",
  productName: "StickIt",
  bundleIdentifier: "com.hankchen.stickit",
  windowsAppUserModelId: "com.stickit.app",
  icons: {
    sourceSvg: "packages/branding/assets/stickit-icon.svg",
    macIcns: "apps/mac-host/StickItMacOS/Resources/AppIcon.icns",
    windowsIco: "apps/windows-host/Assets/AppIcon.ico",
  },
} as const;

export type StickItBranding = typeof stickItBranding;
