import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.cubetimer.app',
  appName: 'Turnix',
  webDir: 'dist',
  // Load the app from the hosted site so web changes go live on each launch
  // without rebuilding the APK. HTTPS, so the camera/scan still works.
  // (To ship a fully offline build instead, remove this `server` block.)
  server: {
    url: 'https://turnix-cude.vercel.app',
    cleartext: false,
  },
}

export default config
