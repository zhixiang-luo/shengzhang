export function pcm16Level(samples: Int16Array): number {
  if (samples.length === 0) return 0;
  let energy = 0;
  for (let index = 0; index < samples.length; index += 4) {
    const normalized = samples[index] / 32768;
    energy += normalized * normalized;
  }
  const rms = Math.sqrt(energy / Math.max(1, samples.length / 4));
  if (rms <= 0.0001) return 0;
  const decibels = 20 * Math.log10(rms);
  return Math.max(0, Math.min(1, (decibels + 52) / 40));
}
