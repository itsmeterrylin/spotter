/** The one keymap: every view's keys, as data. `keys.ts` dispatches them; the `?` overlay lists them. */

export type View = 'list' | 'detail' | 'review';

export type Action =
  | 'help' | 'search' | 'close' | 'sidebar' | 'details'
  | 'go.issues' | 'go.traces' | 'go.judges' | 'go.runs' | 'go.datasets' | 'go.notifications' | 'go.settings'
  | 'list.next' | 'list.prev' | 'list.open' | 'peek' | 'select' | 'status' | 'dismiss'
  | 'object.next' | 'object.prev' | 'back'
  | 'verdict.pass' | 'verdict.fail' | 'verdict.defer' | 'undo' | 'dataset' | 'save.next';

export type Group = 'General' | 'Go to' | 'Rows' | 'Page' | 'Review';

export type Binding = {
  group: Group;
  action: Action;
  label: string;
  /** Key specs. `g i` is a sequence, `Mod+Enter` is Cmd or Ctrl plus Enter. */
  keys: readonly string[];
  views?: readonly View[];
  /** Still fires while focus is in a text field. */
  typing?: boolean;
  /** Still fires while the help overlay is open. */
  modal?: boolean;
  /** Skip when focus is on a button or link, which use Enter and Space themselves. */
  skipOnControl?: boolean;
};

const rows: readonly View[] = ['list', 'detail'];

export const keymap: readonly Binding[] = [
  { group: 'General', action: 'help', label: 'Show keyboard shortcuts', keys: ['?', 'Mod+/'], modal: true },
  { group: 'General', action: 'search', label: 'Search traces', keys: ['/'] },
  { group: 'General', action: 'sidebar', label: 'Toggle sidebar', keys: ['['] },
  { group: 'General', action: 'details', label: 'Toggle details panel', keys: [']'] },
  { group: 'General', action: 'close', label: 'Close menu, peek, panel, or selection', keys: ['Escape'], typing: true, modal: true },
  { group: 'Go to', action: 'go.issues', label: 'Issues', keys: ['g i'] },
  { group: 'Go to', action: 'go.traces', label: 'Traces', keys: ['g t'] },
  { group: 'Go to', action: 'go.judges', label: 'Judges', keys: ['g j'] },
  { group: 'Go to', action: 'go.runs', label: 'Runs', keys: ['g r'] },
  { group: 'Go to', action: 'go.datasets', label: 'Datasets', keys: ['g d'] },
  { group: 'Go to', action: 'go.notifications', label: 'Notifications', keys: ['g n'] },
  { group: 'Go to', action: 'go.settings', label: 'Settings', keys: ['g s'] },
  { group: 'Rows', action: 'list.next', label: 'Move down', keys: ['j', 'ArrowDown'], views: ['list'] },
  { group: 'Rows', action: 'list.prev', label: 'Move up', keys: ['k', 'ArrowUp'], views: ['list'] },
  { group: 'Rows', action: 'list.next', label: 'Move down', keys: ['ArrowDown'], views: ['detail'] },
  { group: 'Rows', action: 'list.prev', label: 'Move up', keys: ['ArrowUp'], views: ['detail'] },
  { group: 'Rows', action: 'list.open', label: 'Open', keys: ['Enter'], views: rows, skipOnControl: true },
  { group: 'Rows', action: 'peek', label: 'Peek', keys: ['Space'], views: rows, skipOnControl: true },
  { group: 'Rows', action: 'select', label: 'Select', keys: ['x'], views: rows },
  { group: 'Rows', action: 'status', label: 'Change status', keys: ['s'] },
  { group: 'Rows', action: 'dismiss', label: 'Dismiss with a reason', keys: ['d'], views: rows },
  { group: 'Page', action: 'object.next', label: 'Next in the list you came from', keys: ['j'], views: ['detail'] },
  { group: 'Page', action: 'object.prev', label: 'Previous in the list you came from', keys: ['k'], views: ['detail'] },
  { group: 'Page', action: 'back', label: 'Back to the list', keys: ['Escape'], views: ['detail', 'review'] },
  { group: 'Review', action: 'verdict.pass', label: 'Pass', keys: ['1'], views: ['review'] },
  { group: 'Review', action: 'verdict.fail', label: 'Fail', keys: ['2'], views: ['review'] },
  { group: 'Review', action: 'verdict.defer', label: 'Defer', keys: ['d'], views: ['review'] },
  { group: 'Review', action: 'undo', label: 'Clear the verdict', keys: ['u'], views: ['review'] },
  { group: 'Review', action: 'dataset', label: 'Add to dataset', keys: ['a'], views: ['review'] },
  { group: 'Review', action: 'list.next', label: 'Next turn', keys: ['ArrowDown'], views: ['review'] },
  { group: 'Review', action: 'list.prev', label: 'Previous turn', keys: ['ArrowUp'], views: ['review'] },
  { group: 'Review', action: 'object.next', label: 'Next trace in the queue', keys: ['j', 'ArrowRight'], views: ['review'] },
  { group: 'Review', action: 'object.prev', label: 'Previous trace in the queue', keys: ['k', 'ArrowLeft'], views: ['review'] },
  { group: 'Review', action: 'save.next', label: 'Save the verdict and go to the next trace', keys: ['Mod+Enter'], views: ['review'], typing: true },
];
