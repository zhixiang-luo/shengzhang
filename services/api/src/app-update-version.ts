export function compareAppVersions(left: string, right: string): number {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  const segmentCount = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < segmentCount; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
}

function parseVersion(value: string): number[] {
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(value);
  if (!match) throw new RangeError(`Invalid app version: ${value}`);
  return match.slice(1).filter((part) => part !== undefined).map(Number);
}
