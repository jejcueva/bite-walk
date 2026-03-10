export const Platform = {
  get OS(): string {
    return (globalThis as { __platformOS?: string }).__platformOS ?? 'ios';
  },
  select: <T>(specifics: Record<string, T>): T | undefined =>
    specifics[(globalThis as { __platformOS?: string }).__platformOS ?? 'ios'] ??
    specifics.default,
};
