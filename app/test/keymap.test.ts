import { describe, expect, test } from 'bun:test';
import { type Binding, keymap, type View } from '../src/client/keymap.ts';

const views: View[] = ['list', 'detail', 'review'];
const inView = (b: Binding, v: View): boolean => !b.views || b.views.includes(v);

describe('keymap', () => {
  test('in every view a key means one action, except Escape which closes before it goes back', () => {
    for (const view of views) {
      const owner = new Map<string, string>();
      for (const b of keymap.filter((x) => inView(x, view))) {
        for (const key of b.keys) {
          const seen = owner.get(key);
          if (seen !== undefined && seen !== b.action) expect([view, key, seen, b.action]).toEqual([view, 'Escape', 'close', 'back']);
          owner.set(key, b.action);
        }
      }
    }
  });

  test('the confirmed Linear keys are bound: j/k, Enter, Space, x, s, Escape, go-to sequences, and the help key', () => {
    const keyed = (action: string, view: View): string[] => keymap.filter((b) => b.action === action && inView(b, view)).flatMap((b) => [...b.keys]);
    expect(keyed('list.next', 'list')).toEqual(['j', 'ArrowDown']);
    expect(keyed('list.prev', 'list')).toEqual(['k', 'ArrowUp']);
    expect(keyed('list.open', 'list')).toEqual(['Enter']);
    expect(keyed('peek', 'list')).toEqual(['Space']);
    expect(keyed('select', 'list')).toEqual(['x']);
    expect(keyed('status', 'list')).toEqual(['s']);
    expect(keyed('object.next', 'detail')).toEqual(['j']);
    expect(keyed('object.prev', 'detail')).toEqual(['k']);
    expect(keyed('back', 'detail')).toEqual(['Escape']);
    expect(keyed('help', 'list')).toEqual(['?', 'Mod+/']);
    expect(keymap.filter((b) => b.group === 'Go to').flatMap((b) => [...b.keys])).toEqual(['g i', 'g t', 'g j', 'g r', 'g d', 'g n', 'g s']);
  });

  test('lists never navigate on Escape and detail pages step with j and k, not the rows under them', () => {
    expect(keymap.some((b) => b.action === 'back' && inView(b, 'list'))).toBe(false);
    expect(keymap.some((b) => b.action === 'list.next' && b.keys.includes('j') && inView(b, 'detail'))).toBe(false);
  });
});
