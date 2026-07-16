# DynaVolt

An AC voltage and load monitor built with Expo and React Native. DynaVolt simulates a single-phase AC supply feeding a load and shows live, meter-style readings with an animated oscilloscope waveform.

## Features

- Live RMS voltage, current, power and frequency readings (simulated, 230 V / 50 Hz)
- Animated scrolling AC waveform (voltage and current) that energizes and de-energizes with the load
- Light and dark themes with a manual toggle
- Customizable appearance: AC color, background and accent, with presets
- Built-in "How it works" guide with offline KaTeX formulas (RMS, real power)

## Tech stack

- Expo SDK 54, Expo Router, React Native 0.81
- NativeWind (Tailwind CSS) and React Native Reusables (shadcn-style components)
- react-native-reanimated and react-native-svg for the waveform
- Phosphor icons
- KaTeX (offline, pre-rendered) for the math

## Getting started

```bash
pnpm install
pnpm expo start
```

Then open the project in Expo Go (SDK 54) or a development build.

## Scripts

- `pnpm expo start` starts the development server
- `node scripts/build-katex-assets.mjs` regenerates the offline KaTeX assets
