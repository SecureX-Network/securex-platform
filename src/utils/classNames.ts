export function classNames(
  ...classes: Array<string | false | null | undefined | 0>
): string {
  return classes.filter(Boolean).join(" ");
}