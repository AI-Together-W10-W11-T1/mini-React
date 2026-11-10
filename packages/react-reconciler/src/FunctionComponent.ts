import { setHookDispatcher } from '@mini-react/react';
import type { HookDispatcher, SetStateAction } from '@mini-react/react';
import type { AreaChildren, Component, Deps, HookSlot, MemoHook, Patch, Props, StateHook, VNode } from '@mini-react/shared';
import { scheduleRender } from '@mini-react/scheduler';
import { depsChanged } from './deps';
import { diff } from './diff';
import { resolveComponents } from './resolveComponents';

/**
 * 엔진이 화면(DOM)에 일을 시키는 통로. DOM을 모르는 인터페이스라 react-reconciler는 DOM 없이 테스트된다.
 * 읽기 메서드가 없다 — 이전 VNode는 엔진이 저장해 두고 DOM에서 다시 읽지 않는다.
 */
export interface FunctionComponentHost {
  /** 처음 그리기: 영역 상자 안 자식 목록을 통째로 그린다 */
  mount(children: AreaChildren): void;
  /** 고치기: Phase 1 patch 목록을 순서대로 적용한다 */
  apply(patches: readonly Patch[]): void;
}

// [AI Note]: FunctionComponent = 함수형 UI 컴포넌트(App)를 감싸는 래퍼 클래스 (P2-01 · P2-03).
// 루트 컴포넌트 하나의 상태(hooks 배열)와 "이전 VNode"를 들고 있고, 렌더 → 풀기 → diff → host.apply를 맡는다.
// 상태가 바뀌면 mount()가 아니라 update()가 불린다 (P2-06). Hook 구현은 이 클래스 안(dispatcher)에 있고
// 공개 API(react 패키지)는 렌더하는 동안만 그 구현을 꽂아 위임한다.
export class FunctionComponent {
  /** Hook 슬롯 배열 (P2-04). 부른 순서대로 쌓이고 렌더마다 0번부터 다시 센다 */
  readonly hooks: HookSlot[] = [];

  private readonly component: Component;
  private readonly props: Props;
  private readonly host: FunctionComponentHost;
  // [AI Note]: 이전 VNode = mount · update 때 만든 "풀린 VNode" 자체. DOM에서 다시 읽지 않는다 (정책 「이전 VNode 보관」).
  private previous: VNode | null = null;
  private patches: readonly Patch[] = [];
  private mounted = false;
  // 이번 렌더에서 지금까지 부른 Hook 수 = 다음 Hook이 쓸 hooks 배열 번호 (렌더마다 0번부터)
  private hookIndex = 0;

  constructor(component: Component, props: Props, host: FunctionComponentHost) {
    this.component = component;
    this.props = props;
    this.host = host;
  }

  /** 마지막 update()의 diff 결과 (읽기 전용). mount 직후 · 바뀐 게 없으면 빈 목록 */
  get lastPatches(): readonly Patch[] {
    return this.patches;
  }

  /** 최초 호출: 초기 UI를 실제 DOM에 그린다 (P2-05) */
  mount(): void {
    if (this.mounted) throw new Error('mount()는 한 번만 부를 수 있습니다');
    const next = this.render();
    this.host.mount([next]);
    this.previous = next;
    this.mounted = true;
  }

  /** 상태 변경 뒤: 다시 실행해 새 VNode를 만들고, 이전과 diff해 바뀐 곳만 반영한다 (P2-06 · P2-18 ~ P2-21) */
  update(): void {
    if (!this.mounted || this.previous === null) throw new Error('mount()를 먼저 불러야 update()를 쓸 수 있습니다');
    const next = this.render();
    // [AI Note]: Phase 1 diff를 그대로 재사용한다 (P2-19). App() 결과 하나 = 영역 자식 목록 [결과] (Phase 1 규칙)
    const patches = diff([this.previous], [next]);
    this.patches = patches;
    if (patches.length > 0) this.host.apply(patches);
    this.previous = next;
  }

  // 컴포넌트를 실행해 새 VNode를 만들고 자식 컴포넌트를 풀어 요소 · 글자만 남긴다
  private render(): VNode {
    this.hookIndex = 0;
    const previousDispatcher = setHookDispatcher(this.dispatcher);
    let result: VNode;
    try {
      result = this.component(this.props);
    } finally {
      setHookDispatcher(previousDispatcher);
    }
    return resolveComponents(result);
  }

  // [AI Note]: 루트 컴포넌트가 렌더 중에 부르는 Hook 구현. useEffect는 Dev-13에서 채운다.
  private readonly dispatcher: HookDispatcher = {
    useState: <S>(initial: S | (() => S)) => this.useState(initial),
    useEffect: () => {
      throw new Error('useEffect는 아직 구현되지 않았습니다');
    },
    useMemo: <T>(factory: () => T, deps?: Deps) => this.useMemo(factory, deps ?? null),
  };

  // [AI Note]: 이름 없는 useState를 구분하는 방법 = "부른 순서". 렌더마다 0번부터 세어 hooks[번호]에서 자기 슬롯을 찾는다.
  // 그래서 if · for 안에서 Hook을 부르면 번호가 밀려 상태가 섞인다 (정책: 금지 + 개수가 달라지면 오류).
  private useState<S>(initial: S | (() => S)): [S, (next: SetStateAction<S>) => void] {
    const index = this.hookIndex++;
    let slot = this.hooks[index];
    if (slot === undefined) {
      // 지연 초기화는 이 슬롯을 처음 만들 때만 실행한다
      const value = typeof initial === 'function' ? (initial as () => S)() : initial;
      const created: StateHook = {
        kind: 'state',
        value,
        setter: (next: unknown) => this.setState(created, next),
      };
      this.hooks[index] = created;
      slot = created;
    } else if (slot.kind !== 'state') {
      throw new Error(`Hook 호출 순서가 달라졌습니다: ${index}번 Hook이 지난번에는 ${slot.kind}, 이번에는 state입니다`);
    }
    return [slot.value as S, slot.setter as (next: SetStateAction<S>) => void];
  }

  // [AI Note]: useMemo = 슬롯에 { 계산값, 의존성 }을 저장. 의존성이 안 바뀌면 factory를 부르지 않고 저장값(같은 참조)을 돌려준다.
  // 생략(null)이면 depsChanged가 항상 true라 매 렌더 다시 계산한다.
  private useMemo<T>(factory: () => T, deps: Deps): T {
    const index = this.hookIndex++;
    const slot = this.hooks[index];
    if (slot === undefined) {
      const created: MemoHook = { kind: 'memo', value: factory(), deps };
      this.hooks[index] = created;
      return created.value as T;
    }
    if (slot.kind !== 'memo') {
      throw new Error(`Hook 호출 순서가 달라졌습니다: ${index}번 Hook이 지난번에는 ${slot.kind}, 이번에는 memo입니다`);
    }
    if (depsChanged(slot.deps, deps)) {
      slot.value = factory();
      slot.deps = deps;
    }
    return slot.value as T;
  }

  // [AI Note]: setter = 값을 바꾸고 즉시 동기 렌더 (알고리즘 결정 9 A). 같은 값(Object.is)이면 아무 일 없음.
  // 한 핸들러에서 여러 번 부르면 그 수만큼 렌더한다. 함수형 setter는 가장 최근 값을 받는다.
  private setState(slot: StateHook, next: unknown): void {
    const value = typeof next === 'function' ? (next as (prev: unknown) => unknown)(slot.value) : next;
    if (Object.is(value, slot.value)) return;
    slot.value = value;
    scheduleRender(() => this.update());
  }
}
