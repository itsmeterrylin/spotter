import { defineEval, type ItemInput } from '../packages/evals/src/index.ts';

type Transcript = { transcript: string };
type Tagged = { exercise: string; sets: number | null; reps: number | null; weight: number | null };

const ones: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

const aliases = {
  v1: { bench: 'bench press', squats: 'squat', 'pull ups': 'pull up', dips: 'dip' },
  v2: { bench: 'bench press', 'pull ups': 'pull up', dips: 'dip', 'incline bench': 'incline bench press' },
} as const;

export const rulesVersion = (): keyof typeof aliases => (process.env.TAGGING_RULES === 'v2' ? 'v2' : 'v1');

const isNumberWord = (token: string): boolean => token in ones;

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

function compound(values: number[]): number | null {
  if (values.length === 0) return null;
  const hundred = values.indexOf(100);
  if (hundred > 0) return sum(values.slice(0, hundred)) * 100 + sum(values.slice(hundred + 1));
  const first = values[0] ?? 0;
  if (values.length >= 2 && first < 10) return first * 100 + sum(values.slice(1));
  return sum(values);
}

const numbersUntil = (tokens: string[], stop: string): { values: number[]; rest: string[] } => {
  const values: number[] = [];
  let i = 0;
  while (i < tokens.length && tokens[i] !== stop && isNumberWord(tokens[i] ?? '')) {
    values.push(ones[tokens[i] ?? ''] ?? 0);
    i += 1;
  }
  return { values, rest: tokens.slice(i) };
};

export function tagTranscript(transcript: string, version: keyof typeof aliases = rulesVersion()): Tagged {
  const tokens = transcript.toLowerCase().split(/\s+/).filter(Boolean);
  const firstNumber = tokens.findIndex(isNumberWord);
  const namePart = (firstNumber === -1 ? tokens : tokens.slice(0, firstNumber)).join(' ');
  const alias: Record<string, string> = aliases[version];
  const exercise = alias[namePart] ?? namePart;
  if (firstNumber === -1) return { exercise, sets: null, reps: null, weight: null };
  const sets = numbersUntil(tokens.slice(firstNumber), 'by');
  const afterSets = sets.rest[0] === 'sets' && sets.rest[1] === 'of' ? sets.rest.slice(2) : sets.rest.slice(1);
  const reps = numbersUntil(afterSets, 'at');
  const weight = reps.rest[0] === 'at' ? numbersUntil(reps.rest.slice(1), '') : { values: [] };
  return { exercise, sets: sum(sets.values) || null, reps: sum(reps.values) || null, weight: compound(weight.values) };
}

const item = (n: number, transcript: string, exercise: string, sets: number, reps: number, weight: number | null): ItemInput<Transcript, Tagged> => ({
  id: `tagging-${String(n).padStart(2, '0')}`,
  input: { transcript },
  expected: { exercise, sets, reps, weight },
});

export const items: ItemInput<Transcript, Tagged>[] = [
  item(1, 'bench press three by five at two twenty five', 'bench press', 3, 5, 225),
  item(2, 'squats five by five at three fifteen', 'squat', 5, 5, 315),
  item(3, 'deadlift one by five at four oh five', 'deadlift', 1, 5, 405),
  item(4, 'overhead press four by eight at ninety five', 'overhead press', 4, 8, 95),
  item(5, 'bench three by ten at one thirty five', 'bench press', 3, 10, 135),
  item(6, 'barbell row three by eight at one eighty five', 'barbell row', 3, 8, 185),
  item(7, 'pull ups three by ten', 'pull up', 3, 10, null),
  item(8, 'romanian deadlift three by eight at two twenty five', 'romanian deadlift', 3, 8, 225),
  item(9, 'squats four sets of six at two forty five', 'squat', 4, 6, 245),
  item(10, 'incline bench two by twelve at one fifteen', 'incline bench press', 2, 12, 115),
  item(11, 'dips three by twelve', 'dip', 3, 12, null),
  item(12, 'front squat three by five at one hundred eighty five', 'front squat', 3, 5, 185),
];

export default defineEval<Transcript, Tagged, Tagged>({
  dataset: 'tagging-golden',
  project: 'copper',
  metadata: { model: `rules-${rulesVersion()}`, variant_env: ['TAGGING_RULES'] },
  task: (item) => tagTranscript(item.input.transcript),
  scores: [
    (item, output) => ({
      name: 'exercise_match',
      value: output.exercise === item.expected?.exercise ? 1 : 0,
      reason: output.exercise === item.expected?.exercise ? null : `got ${output.exercise}, expected ${item.expected?.exercise}`,
    }),
    (item, output) => ({ name: 'weight_found', value: output.weight === item.expected?.weight ? 1 : 0 }),
  ],
});
