
/**
 * Pre-processes markdown text to ensure math delimiters are correctly formatted for remark-math.
 * Converts \[ \] to $$ $$ and \( \) to $ $.
 */
export const preprocessMath = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');
};
