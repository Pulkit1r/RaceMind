/**
 * fitTireCoefficients.ts
 * 
 * Node.js script that reads synthetic F1 lap data from public/data/f1_lap_data.json
 * and fits tire degradation coefficients using ordinary least squares regression.
 * 
 * For each compound (Soft/Medium/Hard), fits:
 *   - lapTimePenalty: seconds per 1% wear lost
 *   - wearPerLap: base wear rate
 *   - wearAccel: quadratic wear acceleration
 *   - baseOffset: lap time offset vs medium baseline
 * 
 * Usage: npx tsx scripts/fitTireCoefficients.ts
 * Output: public/data/fittedCoefficients.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LapRow {
  track: string;
  compound: string;
  lapNumber: number;
  lapTime: number;
  tireAge: number;
  fuelLoad: number;
  trackTemp: number;
}

interface FittedParams {
  baseOffset: number;
  wearPerLap: number;
  wearAccel: number;
  lapTimePenalty: number;
}

// ─── Least Squares Linear Regression ─────────────────────────────────────────
// Fits y = a + b*x minimizing sum of (y_pred - y_actual)^2
function linearRegression(x: number[], y: number[]): { intercept: number; slope: number; r2: number } {
  const n = x.length;
  if (n < 2) return { intercept: 0, slope: 0, r2: 0 };

  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
  const sumX2 = x.reduce((s, v) => s + v * v, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return { intercept: sumY / n, slope: 0, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const meanY = sumY / n;
  const ssTot = y.reduce((s, v) => s + (v - meanY) ** 2, 0);
  const ssRes = y.reduce((s, v, i) => s + (v - (intercept + slope * x[i])) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { intercept, slope, r2 };
}

// ─── Main ────────────────────────────────────────────────────────────────────
function main(): void {
  const dataPath = path.resolve(__dirname, '../public/data/f1_lap_data.json');
  const outputPath = path.resolve(__dirname, '../public/data/fittedCoefficients.json');

  console.log('📊 Loading F1 lap data...');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const lapData: LapRow[] = JSON.parse(rawData);
  console.log(`   Found ${lapData.length} data points`);

  const compounds = ['soft', 'medium', 'hard'];
  const baseLapTime = 75.5;
  const fuelLoadFull = 70;
  const result: Record<string, FittedParams> = {};

  for (const compound of compounds) {
    const rows = lapData.filter(r => r.compound.toLowerCase() === compound);
    console.log(`\n🏎️  Fitting ${compound.toUpperCase()} (${rows.length} rows)...`);

    if (rows.length < 5) {
      console.warn(`   ⚠️ Insufficient data, skipping`);
      continue;
    }

    // --- Fit baseOffset ---
    // baseOffset = mean(lapTime - baseLapTime) for laps with tireAge=0, full fuel
    const freshLaps = rows.filter(r => r.tireAge <= 1);
    const fuelAdjustedTimes = freshLaps.map(r => {
      const fuelEffect = -((fuelLoadFull - r.fuelLoad) / fuelLoadFull) * 1.4;
      return r.lapTime - baseLapTime - fuelEffect;
    });
    const baseOffset = fuelAdjustedTimes.length > 0
      ? fuelAdjustedTimes.reduce((s, v) => s + v, 0) / fuelAdjustedTimes.length
      : 0;

    // --- Fit lapTimePenalty ---
    // Remove fuel effect and base offset, regress remaining against tireAge
    // lapTime ≈ baseLapTime + baseOffset + fuelEffect + lapTimePenalty * wearLost + noise
    // wearLost ≈ wearPerLap * tireAge (roughly)
    // So: (lapTime - baseLapTime - baseOffset - fuelEffect) vs tireAge gives us degradation rate
    const tireAges = rows.map(r => r.tireAge);
    const adjustedTimes = rows.map(r => {
      const fuelEffect = -((fuelLoadFull - r.fuelLoad) / fuelLoadFull) * 1.4;
      return r.lapTime - baseLapTime - baseOffset - fuelEffect;
    });

    const { slope: degradationRate, r2: r2Degrad } = linearRegression(tireAges, adjustedTimes);

    // --- Fit wearPerLap and wearAccel ---
    // Use tireAge^2 fitting for wear acceleration
    // wear(age) ≈ wearPerLap * age + 0.5 * wearAccel * age^2
    // From degradation: lapTimePenalty * (wearPerLap * age + wearAccel * age^2) ≈ adjustedTime
    // Use two-variable regression: adjustedTime = a * age + b * age^2
    const ages = rows.map(r => r.tireAge).filter(a => a > 0);
    const aged2 = ages.map(a => a * a);
    const agedTimes = rows
      .filter(r => r.tireAge > 0)
      .map(r => {
        const fuelEffect = -((fuelLoadFull - r.fuelLoad) / fuelLoadFull) * 1.4;
        return r.lapTime - baseLapTime - baseOffset - fuelEffect;
      });

    // Simple two-variable OLS: y = b1*x1 + b2*x2
    // Normal equations: [x1'x1, x1'x2; x2'x1, x2'x2] * [b1; b2] = [x1'y; x2'y]
    const x1x1 = ages.reduce((s, v) => s + v * v, 0);
    const x1x2 = ages.reduce((s, v, i) => s + v * aged2[i], 0);
    const x2x2 = aged2.reduce((s, v) => s + v * v, 0);
    const x1y = ages.reduce((s, v, i) => s + v * agedTimes[i], 0);
    const x2y = aged2.reduce((s, v, i) => s + v * agedTimes[i], 0);

    const det = x1x1 * x2x2 - x1x2 * x1x2;
    let linearCoeff: number;
    let quadCoeff: number;

    if (Math.abs(det) > 1e-12) {
      linearCoeff = (x2x2 * x1y - x1x2 * x2y) / det;
      quadCoeff = (x1x1 * x2y - x1x2 * x1y) / det;
    } else {
      linearCoeff = degradationRate;
      quadCoeff = 0;
    }

    // Convert to our physics model parameters
    // degradation per lap ≈ linearCoeff, so lapTimePenalty = linearCoeff / wearPerLap
    // wearAccel contribution ≈ quadCoeff
    // We need to separate wearPerLap and lapTimePenalty
    // Using known relationship: lapTimePenalty * wearPerLap ≈ linearCoeff
    // and: lapTimePenalty * wearAccel ≈ quadCoeff * 2

    // Use defaults as constraints to keep params physical
    const defaultParams: Record<string, FittedParams> = {
      soft:   { baseOffset: -0.30, wearPerLap: 3.0, wearAccel: 0.08, lapTimePenalty: 0.025 },
      medium: { baseOffset:  0.00, wearPerLap: 1.8, wearAccel: 0.04, lapTimePenalty: 0.018 },
      hard:   { baseOffset:  0.40, wearPerLap: 1.0, wearAccel: 0.015, lapTimePenalty: 0.012 },
    };

    const defaults = defaultParams[compound];
    const fittedLapTimePenalty = Math.max(0.005, Math.min(0.05,
      Math.abs(linearCoeff) > 0.001 ? linearCoeff / defaults.wearPerLap : defaults.lapTimePenalty
    ));
    const fittedWearPerLap = Math.max(0.5, Math.min(5.0,
      Math.abs(linearCoeff) > 0.001 ? linearCoeff / fittedLapTimePenalty : defaults.wearPerLap
    ));
    const fittedWearAccel = Math.max(0.005, Math.min(0.15,
      Math.abs(quadCoeff) > 0.0001 ? Math.abs(quadCoeff * 2 / fittedLapTimePenalty) : defaults.wearAccel
    ));

    const fitted: FittedParams = {
      baseOffset: parseFloat(baseOffset.toFixed(4)),
      wearPerLap: parseFloat(fittedWearPerLap.toFixed(4)),
      wearAccel: parseFloat(fittedWearAccel.toFixed(4)),
      lapTimePenalty: parseFloat(fittedLapTimePenalty.toFixed(4)),
    };

    result[compound] = fitted;

    console.log(`   baseOffset:     ${fitted.baseOffset.toFixed(4)}s (default: ${defaults.baseOffset})`);
    console.log(`   wearPerLap:     ${fitted.wearPerLap.toFixed(4)}/lap (default: ${defaults.wearPerLap})`);
    console.log(`   wearAccel:      ${fitted.wearAccel.toFixed(4)} (default: ${defaults.wearAccel})`);
    console.log(`   lapTimePenalty:  ${fitted.lapTimePenalty.toFixed(4)}s/%wear (default: ${defaults.lapTimePenalty})`);
    console.log(`   R² (degradation): ${r2Degrad.toFixed(4)}`);
  }

  // Write output
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n✅ Fitted coefficients written to ${outputPath}`);
}

main();
