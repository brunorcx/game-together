export function normalizeGameTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(?:mr|mrs|ms|dr)\s+/, "");
}

function levenshteinSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous = current;
  }

  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  const intersection = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  return (2 * intersection) / (leftTokens.size + rightTokens.size);
}

export function gameTitleSimilarity(leftTitle: string, rightTitle: string): number {
  const left = normalizeGameTitle(leftTitle);
  const right = normalizeGameTitle(rightTitle);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const editScore = levenshteinSimilarity(left, right);
  const tokenScore = tokenSimilarity(left, right);
  const sortedEditScore = levenshteinSimilarity(left.split(" ").sort().join(" "), right.split(" ").sort().join(" "));
  const leftPrefix = right.startsWith(`${left} `);
  const rightPrefix = left.startsWith(`${right} `);
  const prefix = leftPrefix ? right.slice(left.length).trim() : rightPrefix ? left.slice(right.length).trim() : "";
  const validEditionPrefix =
    /^(?:(?:complete|definitive|ultimate|director s cut|remastered|remake|enhanced|special|anniversary|deluxe|hd|game of the year|goty|edition|collection)(?:\s+(?:edition|remaster|remastered|cut|version))?|(?:19|20)\d{2}\s+edition)$/i.test(prefix);
  const prefixScore = validEditionPrefix ? 0.88 : 0;

  return Math.max(editScore, sortedEditScore * 0.7 + tokenScore * 0.3, prefixScore);
}
