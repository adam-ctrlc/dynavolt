import { useEffect, useState } from 'react';

export const NOMINAL_VOLTAGE = 230;
export const NOMINAL_FREQUENCY = 50;
export const POWER_FACTOR = 0.95;

export type AcReading = {
  voltageRms: number;
  currentRms: number;
  power: number;
  frequency: number;
};

function jitter(base: number, spread: number) {
  return base + (Math.random() * 2 - 1) * spread;
}

export function useAcSimulation(energized: boolean, intervalMs = 800): AcReading {
  const [reading, setReading] = useState<AcReading>(() => ({
    voltageRms: NOMINAL_VOLTAGE,
    currentRms: 0,
    power: 0,
    frequency: NOMINAL_FREQUENCY,
  }));

  useEffect(() => {
    function tick() {
      const voltageRms = jitter(NOMINAL_VOLTAGE, 2);
      const frequency = jitter(NOMINAL_FREQUENCY, 0.08);
      const currentRms = Math.max(0, energized ? jitter(4, 1.2) : jitter(0.02, 0.02));
      const power = voltageRms * currentRms * POWER_FACTOR;
      setReading({ voltageRms, currentRms, power, frequency });
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [energized, intervalMs]);

  return reading;
}
