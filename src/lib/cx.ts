/** Junta classes CSS ignorando valores falsos. cx('a', cond && 'b') → "a b" */
export function cx(...parts: Array<string | false | null | undefined | 0>): string {
  return parts.filter(Boolean).join(' ');
}
