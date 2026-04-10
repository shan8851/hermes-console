export type CommandResultGroup = 'Routes' | 'Agents' | 'Sessions' | 'Cron' | 'Skills' | 'Files';

export type CommandResult = {
  id: string;
  group: CommandResultGroup;
  title: string;
  subtitle: string;
  keywords: string[];
  onSelect: () => void;
};

const groupPriority: Record<CommandResultGroup, number> = {
  Routes: 0,
  Agents: 1,
  Sessions: 2,
  Cron: 3,
  Skills: 4,
  Files: 5
};

const normalizeTerms = (query: string): string[] =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

const subsequenceScore = (needle: string, haystack: string): number => {
  if (!needle.length) {
    return 0;
  }

  let cursor = 0;
  let score = 0;

  for (const character of needle) {
    const nextIndex = haystack.indexOf(character, cursor);

    if (nextIndex === -1) {
      return -1;
    }

    score += nextIndex === cursor ? 5 : 2;
    cursor = nextIndex + 1;
  }

  return score;
};

const scoreCommandResult = (query: string, result: CommandResult): number => {
  const terms = normalizeTerms(query);

  if (terms.length === 0) {
    return 20 - groupPriority[result.group];
  }

  const title = result.title.toLowerCase();
  const subtitle = result.subtitle.toLowerCase();
  const keywordText = result.keywords.join(' ').toLowerCase();
  const combinedText = [title, subtitle, keywordText].join(' ');

  return terms.reduce((totalScore, term) => {
    if (totalScore < 0) {
      return totalScore;
    }

    if (title === term) {
      return totalScore + 140;
    }

    if (title.startsWith(term)) {
      return totalScore + 90;
    }

    if (title.includes(term)) {
      return totalScore + 70;
    }

    if (keywordText.includes(term)) {
      return totalScore + 55;
    }

    if (subtitle.includes(term)) {
      return totalScore + 35;
    }

    const fuzzyScore = subsequenceScore(term, combinedText);

    if (fuzzyScore > 0) {
      return totalScore + fuzzyScore;
    }

    return -1;
  }, 20 - groupPriority[result.group]);
};

export const filterCommandResults = (results: CommandResult[], query: string): CommandResult[] =>
  results
    .map((result) => ({
      result,
      score: scoreCommandResult(query, result)
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.result.group !== right.result.group) {
        return groupPriority[left.result.group] - groupPriority[right.result.group];
      }

      return left.result.title.localeCompare(right.result.title);
    })
    .map((entry) => entry.result);

export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};
