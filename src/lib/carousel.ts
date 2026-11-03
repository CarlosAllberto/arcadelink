export function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

/** Distância assinada e mais curta de `index` até `current` numa lista circular. */
export function circularOffset(index: number, current: number, length: number) {
  const distance = wrapIndex(index - current, length);
  return distance > length / 2 ? distance - length : distance;
}

/** Índice aleatório que evita repetir o atual quando há outra opção. */
export function randomOther(length: number, current: number, random = Math.random) {
  if (length < 2) return 0;
  const index = Math.floor(random() * (length - 1));
  return index >= current ? index + 1 : index;
}
