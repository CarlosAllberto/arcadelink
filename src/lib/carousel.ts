export function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

/** Distância assinada e mais curta de `index` até `current` numa lista circular. */
export function circularOffset(index: number, current: number, length: number) {
  const distance = wrapIndex(index - current, length);
  return distance > length / 2 ? distance - length : distance;
}
