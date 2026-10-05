let lastMs = 0;
let seq = 0;

const hex = (n: number, digits: number): string => n.toString(16).padStart(digits, '0');

export function uuid7(now: number = Date.now()): string {
  if (now > lastMs) {
    lastMs = now;
    seq = 0;
  } else {
    seq += 1;
    if (seq > 0xfff) {
      lastMs += 1;
      seq = 0;
    }
  }
  const rand = new Uint8Array(8);
  crypto.getRandomValues(rand);
  const time = hex(lastMs, 12);
  const a = hex(0x7000 | seq, 4);
  const b = hex(0x8000 | (((rand[0] ?? 0) << 8 | (rand[1] ?? 0)) & 0x3fff), 4);
  const c = Array.from(rand.subarray(2), (x) => hex(x, 2)).join('');
  return `${time.slice(0, 8)}-${time.slice(8)}-${a}-${b}-${c}`;
}

export const isUuid = (s: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
