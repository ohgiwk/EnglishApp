import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.keiya.lovelanguage',
  appName: 'Love Language',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: 'none',
      style: 'DARK',
      autoBackdropColor: 'auto',
    },
  },
}

export default config
