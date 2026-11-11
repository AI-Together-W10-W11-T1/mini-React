import { setHookDispatcher } from '@mini-react/react';
import type { HookDispatcher, SetStateAction } from '@mini-react/react';
import type { AreaChildren, Component, Deps, EffectCallback, EffectHook, HookSlot, MemoHook, Patch, Props, StateHook, VNode } from '@mini-react/shared';
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

const ORDER_ERROR = 'Hook 호출 순서 · 개수가 달라졌습니다';

interface PendingEffect {
  readonly slot: EffectHook;
  readonly effect: EffectCallback;
  readonly deps: Deps;
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
  private unmounted = false;
  // [AI Note]: effect는 렌더 중에 "실행할 목록"에만 올리고, host 반영이 끝난 뒤에 돌린다 (patch 직후 실행).
  // 슬롯마다 가장 최근에 예약된 것(latest)만 유효하다 — 더 최근 렌더가 대신 처리했거나 취소한 effect가 옛 클로저로 다시 돌지 않게 하는 보호 장치다.
  // (결정 9 B Batching부터 렌더가 effect 안에서 중첩되지 않아 이 보호가 실제로 작동할 일은 드물지만, 회귀 위험 때문에 지우지 않았다 — task_003 결정.)
  private pendingEffects: PendingEffect[] = [];
  // [AI Note]: 렌더 중에 만든 예약은 여기(staged)에만 담고, 렌더가 성공한 뒤에야 pendingEffects · latestPending에 반영한다 (검수 NB-2).
  // 렌더가 실패하면 staged를 버리기만 하면 되므로 앞 렌더가 남긴 예약(latestPending)이 흔들리지 않는다.
  private staged: { list: PendingEffect[]; latest: Map<EffectHook, PendingEffect | null> } = { list: [], latest: new Map() };
  private readonly latestPending = new WeakMap<EffectHook, PendingEffect>();
  private readonly runCount = new WeakMap<EffectHook, number>();
  // 첫 렌더가 끝났을 때의 Hook 수. 이후 렌더가 이 수와 다르면 오류 (null = 아직 첫 렌더 전)
  private expectedHookCount: number | null = null;
  // 이번 렌더에서 지금까지 부른 Hook 수 = 다음 Hook이 쓸 hooks 배열 번호 (렌더마다 0번부터)
  private hookIndex = 0;
  // [AI Note]: 렌더 도중(컴포넌트 본문 · 자식 풀기) 표시. 이 동안 setter는 오류 — 안쪽 렌더가 hookIndex · 예약 목록을 덮어써 상태 · 화면이 어긋나기 때문 (검수 NB-1).
  // effect · cleanup · 이벤트 핸들러는 렌더가 끝난 뒤에 돌아 이 표시가 꺼져 있으므로 setter가 허용된다.
  private rendering = false;

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
    const next = this.renderChecked();
    const effects = this.takePendingEffects();
    this.host.mount([next]);
    this.previous = next;
    this.mounted = true;
    this.runEffects(effects);
  }

  /** 상태 변경 뒤: 다시 실행해 새 VNode를 만들고, 이전과 diff해 바뀐 곳만 반영한다 (P2-06 · P2-18 ~ P2-21) */
  update(): void {
    if (!this.mounted || this.previous === null) throw new Error('mount()를 먼저 불러야 update()를 쓸 수 있습니다');
    if (this.unmounted) return;
    const next = this.renderChecked();
    const effects = this.takePendingEffects();
    // [AI Note]: Phase 1 diff를 그대로 재사용한다 (P2-19). App() 결과 하나 = 영역 자식 목록 [결과] (Phase 1 규칙)
    const patches = diff([this.previous], [next]);
    if (patches.length > 0) this.applyOrRecover(patches, this.previous);
    this.patches = patches; // 성공한 update의 diff만 남긴다 (실패하면 위에서 예외로 빠져나가 이전 값 그대로)
    this.previous = next;
    this.runEffects(effects);
  }

  // [AI Note]: update 중 patch가 도중에 던지면 DOM이 반쯤만 고쳐진 채 "이전 VNode"는 옛것이라 어긋난다 (검수 NB-7).
  // 그래서 마지막으로 성공한 VNode(previous)로 영역을 다시 그린 뒤 원래 예외를 위로 던진다 — Phase 1 C2(createVDomRoot)와 같은 복구 규칙.
  // 이 복구가 영역을 통째로 다시 그리는 "정상 갱신에서는 금지"된 경로의 유일한 Phase 2 쓰임이다. effect는 화면에 반영되지 않았으니 돌리지 않는다.
  // 복구도 실패하면 던지는 것은 여전히 원래 예외이고, 복구 예외는 `recoveryError`로 붙인다 (복구 예외가 원인을 덮지 않도록).
  private applyOrRecover(patches: readonly Patch[], previous: VNode): void {
    try {
      this.host.apply(patches);
    } catch (error) {
      try {
        this.host.mount([previous]);
      } catch (recoveryError) {
        if (typeof error === 'object' && error !== null && Object.isExtensible(error)) {
          Object.defineProperty(error, 'recoveryError', { value: recoveryError, configurable: true, writable: true });
        }
      }
      throw error;
    }
  }

  /** 정리: 남은 모든 effect의 cleanup을 실행한다. 이후 setter는 아무 일 없다. 두 번 불러도 두 번째는 아무 일 없다 */
  unmount(): void {
    if (this.unmounted) return;
    this.unmounted = true;
    for (const slot of this.hooks) {
      if (slot.kind === 'effect' && slot.cleanup !== null) {
        const cleanup = slot.cleanup;
        slot.cleanup = null;
        cleanup();
      }
    }
  }

  // [AI Note]: 렌더가 실패하면(Hook 순서 · 개수 오류, 자식 Hook 호출, 컴포넌트 예외) 이번 렌더는 "없었던 일"로 한다 —
  // 이전 VNode · DOM(host는 아직 안 불렸음)은 그대로이고, 이번 렌더가 만든 슬롯은 버리고 바꾼 슬롯 값(memo 등)은 되돌린다.
  // (setter가 렌더 전에 바꿔 둔 state 값은 렌더의 일이 아니라 그대로 둔다.) 예외는 그대로 위로 던진다.
  private renderChecked(): VNode {
    const saved = this.hooks.map((slot) => ({ ...slot }));
    try {
      const next = this.render();
      // 부른 Hook 수가 첫 렌더와 다르면 번호가 밀려 상태가 섞이므로 막는다 (if · for 안 Hook 금지)
      if (this.expectedHookCount === null) {
        this.expectedHookCount = this.hookIndex;
      } else if (this.hookIndex !== this.expectedHookCount) {
        throw new Error(`${ORDER_ERROR}: 첫 렌더 ${this.expectedHookCount}개, 이번 ${this.hookIndex}개`);
      }
      // 렌더 성공: 이제서야 effect 예약을 반영한다 (슬롯마다 최근 예약 = null이면 취소)
      this.pendingEffects = this.staged.list;
      for (const [slot, pending] of this.staged.latest) {
        if (pending === null) this.latestPending.delete(slot);
        else this.latestPending.set(slot, pending);
      }
      return next;
    } catch (error) {
      this.hooks.length = saved.length;
      saved.forEach((copy, i) => Object.assign(this.hooks[i], copy));
      throw error;
    } finally {
      this.staged = { list: [], latest: new Map() };
    }
  }

  // 컴포넌트를 실행해 새 VNode를 만들고 자식 컴포넌트를 풀어 요소 · 글자만 남긴다
  private render(): VNode {
    this.hookIndex = 0;
    this.staged = { list: [], latest: new Map() };
    const previousDispatcher = setHookDispatcher(this.dispatcher);
    this.rendering = true;
    try {
      return resolveComponents(this.component(this.props));
    } finally {
      this.rendering = false;
      setHookDispatcher(previousDispatcher);
    }
  }

  // [AI Note]: 루트 컴포넌트가 렌더 중에 부르는 Hook 구현 (useState · useEffect · useMemo).
  private readonly dispatcher: HookDispatcher = {
    useState: <S>(initial: S | (() => S)) => this.useState(initial),
    useEffect: (effect: EffectCallback, deps?: Deps) => this.useEffect(effect, deps ?? null),
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
      throw new Error(`${ORDER_ERROR}: ${index}번 Hook이 지난번에는 ${slot.kind}, 이번에는 state입니다`);
    }
    return [slot.value as S, slot.setter as (next: SetStateAction<S>) => void];
  }

  // [AI Note]: useEffect = 렌더 중에는 슬롯만 만들고 "이번에 돌릴지"만 정한다 (의존성이 처음이거나 바뀌었으면 예약).
  // 실제 실행은 mount() · update()가 host 반영을 끝낸 뒤 runEffects에서 한다 (T-12: DOM 반영 뒤 실행).
  private useEffect(effect: EffectCallback, deps: Deps): void {
    const index = this.hookIndex++;
    let slot = this.hooks[index];
    let changed: boolean;
    if (slot === undefined) {
      slot = { kind: 'effect', deps: null, cleanup: null };
      this.hooks[index] = slot;
      changed = true; // 처음 렌더는 의존성이 [] 여도 한 번 돈다
    } else if (slot.kind !== 'effect') {
      throw new Error(`${ORDER_ERROR}: ${index}번 Hook이 지난번에는 ${slot.kind}, 이번에는 effect입니다`);
    } else {
      changed = depsChanged(slot.deps, deps);
    }
    if (changed) {
      const pending: PendingEffect = { slot, effect, deps };
      this.staged.list.push(pending);
      this.staged.latest.set(slot, pending);
    } else {
      this.staged.latest.set(slot, null); // 이번 렌더는 안 돌린다 → (렌더가 성공하면) 앞 렌더가 남긴 예약이 있으면 취소
    }
  }

  private takePendingEffects(): PendingEffect[] {
    const list = this.pendingEffects;
    this.pendingEffects = [];
    return list;
  }

  // [AI Note]: effect 실행 순서 = 이전 cleanup → 본문 → 돌려준 함수를 cleanup에 저장. 선언 순서대로.
  // 본문 안에서 setter를 부르면 렌더가 새로 예약되고 이 호출이 끝난 뒤 마이크로태스크로 돈다 (결정 9 B — 렌더가 중첩되지 않고 연달아 이어진다).
  // deps를 본문 실행 "전에" 저장하는 것과 run 번호 확인(같은 effect가 도는 사이 다시 돌았다면 늦게 돌려준 cleanup을 바로 부름)은
  // 결정 9 A(즉시 동기, 렌더 중첩) 때 필요했던 보호 코드다. Batching에서는 작동할 일이 드물지만 지우지 않고 남겼다 (task_003 결정).
  private runEffects(list: readonly PendingEffect[]): void {
    for (const pending of list) {
      if (this.unmounted) return;
      const { slot, effect, deps } = pending;
      if (this.latestPending.get(slot) !== pending) continue; // 더 최근 렌더가 대신 처리했거나 취소함
      this.latestPending.delete(slot);
      if (slot.cleanup !== null) {
        const cleanup = slot.cleanup;
        slot.cleanup = null;
        cleanup();
      }
      slot.deps = deps;
      const run = (this.runCount.get(slot) ?? 0) + 1;
      this.runCount.set(slot, run);
      const result = effect();
      const cleanup = typeof result === 'function' ? result : null;
      if (this.runCount.get(slot) === run) slot.cleanup = cleanup;
      else cleanup?.();
    }
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
      throw new Error(`${ORDER_ERROR}: ${index}번 Hook이 지난번에는 ${slot.kind}, 이번에는 memo입니다`);
    }
    if (depsChanged(slot.deps, deps)) {
      slot.value = factory();
      slot.deps = deps;
    }
    return slot.value as T;
  }

  // [AI Note]: setter = 칸 값을 바로 바꾸고 렌더는 scheduler에 예약 (알고리즘 결정 9 B, 마이크로태스크 Batching). 같은 값(Object.is)이면 예약하지 않음.
  // 같은 틱에서 여러 번 불러도 렌더(update)는 컴포넌트당 한 번이고, 함수형 setter는 가장 최근 값(앞 setter가 쓴 값)을 받는다.
  // 렌더 중 setter 오류 · unmount 뒤 무시는 예약 전에 걸러 낸다. task_002(결정 9 A 즉시 동기)에서는 여기서 곧바로 update()를 불렀다.
  private setState(slot: StateHook, next: unknown): void {
    if (this.unmounted) return; // unmount() 뒤 setter는 무시 (함수형 setter의 함수도 부르지 않는다)
    if (this.rendering) throw new Error('렌더 중에는 setter를 부를 수 없습니다');
    const value = typeof next === 'function' ? (next as (prev: unknown) => unknown)(slot.value) : next;
    if (Object.is(value, slot.value)) return;
    slot.value = value;
    scheduleRender(this, () => this.update());
  }
}
