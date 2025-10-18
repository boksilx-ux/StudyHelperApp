import { create } from 'zustand';

export type OrderMode = 'normal' | 'wrong-first' | 'wrong-only';
export type PlayMode  = 'sequential' | 'shuffle';

type State = {
  queue: string[];
  wrongSet: Set<string>;
  orderMode: OrderMode;
  playMode: PlayMode;
  looping: boolean;
  current?: string;
};

type Actions = {
  loadQueue: (cards: string[], wrong: string[]) => void;
  next: () => void;
  markWrong: (id: string) => void;
};

export const useStudyStore = create<State & Actions>((set, get) => ({
  queue: [],
  wrongSet: new Set(),
  orderMode: 'wrong-first',
  playMode: 'sequential',
  looping: false,
  current: undefined,

  loadQueue: (cards, wrong) => set(() => {
    const wrongSet = new Set(wrong);
    const wrongFirst = cards.filter(c => wrongSet.has(c));
    const normal = cards.filter(c => !wrongSet.has(c));
    const merged = [...wrongFirst, ...normal];
    return { queue: merged, wrongSet, current: merged[0] };
  }),

  next: () => set(state => {
    if (state.queue.length <= 1) return { ...state, queue: [], current: undefined };
    const [, ...rest] = state.queue;
    return { ...state, queue: rest, current: rest[0] };
  }),

  markWrong: (id) => set(state => {
    state.wrongSet.add(id);
    return { ...state };
  }),
}));
