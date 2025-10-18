import { useStudyStore } from '../../src/state/useStudyStore';

describe('study queue', () => {
  it('loads wrong-first order', () => {
    const ids = ['a','b','c','d'];
    const wrong = ['c','a'];
    useStudyStore.getState().loadQueue(ids, wrong);
    const q = useStudyStore.getState().queue;
    expect(q.slice(0,2).sort()).toEqual(['a','c'].sort());
  });
});
