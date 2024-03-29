## ReactDOM.render

#### 1. (createFiberRoot)创建fiberRoot

(createHostRootFiber)创建 uninitializedFiber 根fiber HostRoot (current树)
建立连接 fiberRoot.current = uninitializedFiber uninitializedFiber.stateNode = fiberRoot

#### 2.(enqueueUpdate) 创建update对象

element对象（jsx解析出来的对象）放到update.payload载荷中，再挂载到fiberRoot的updateQueue.pending中

```javascript
export function enqueueUpdate<State>(fiber: Fiber, update: Update<State>) {
  const updateQueue = fiber.updateQueue;
  if (updateQueue === null) {
    // Only occurs if the fiber has been unmounted.
    return;
  }

  const sharedQueue: SharedQueue<State> = (updateQueue: any).shared;
  const pending = sharedQueue.pending;
  if (pending === null) {
    // This is the first update. Create a circular list.
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  sharedQueue.pending = update;
}
```

#### 3.(scheduleUpdateOnFiber, performSyncWorkOnRoot) 开始调度

```javascript
export function scheduleUpdateOnFiber(
  fiber: Fiber,
  expirationTime: ExpirationTime,
) {
  const root = markUpdateTimeFromFiberToRoot(fiber, expirationTime);
  if (root === null) {
    warnAboutUpdateOnUnmountedFiberInDEV(fiber);
    return;
  }
  if (expirationTime === Sync) {
    if (
      // Check if we're inside unbatchedUpdates
      (executionContext & LegacyUnbatchedContext) !== NoContext &&
      // Check if we're not already rendering
      (executionContext & (RenderContext | CommitContext)) === NoContext
    ) {
      // Register pending interactions on the root to avoid losing traced interaction data.
      schedulePendingInteractions(root, expirationTime);

      // This is a legacy edge case. The initial mount of a ReactDOM.render-ed
      // root inside of batchedUpdates should be synchronous, but layout updates
      // should be deferred until the end of the batch.
      performSyncWorkOnRoot(root);
    } else {
      // ...
    }
  } else {
			// ...
  }
}
```

#### 4.(createWorkInProgress) 创建workInProgress

workInProgress.alternate 指向 根fiber, 根fiber的alternate 指向 workInProgress
```javascript
export function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // We use a double buffering pooling technique because we know that we'll
    // only ever need at most two versions of a tree. We pool the "other" unused
    // node that we're free to reuse. This is lazily created to avoid allocating
    // extra objects for things that are never updated. It also allow us to
    // reclaim the extra memory if needed.
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode,
    );
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // ...
  }

  workInProgress.childExpirationTime = current.childExpirationTime;
  workInProgress.expirationTime = current.expirationTime;

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;

  // Clone the dependencies object. This is mutated during the render phase, so
  // it cannot be shared with the current fiber.
  const currentDependencies = current.dependencies_old;
  workInProgress.dependencies_old =
    currentDependencies === null
      ? null
      : {
          expirationTime: currentDependencies.expirationTime,
          firstContext: currentDependencies.firstContext,
          responders: currentDependencies.responders,
        };

  // These will be overridden during the parent's reconciliation
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;

  return workInProgress;
}
```

#### 5.(workLoopSync, performUnitOfWork) while循环 调用 performUnitOfWork 创建 workInProgress 的 子fiber

```javascript
function workLoopSync() {
  // Already timed out, so perform work without checking if we need to yield.
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}
```

#### 6.(beginWork) 处理当前 workInProgress

判断当前处理当前 workInProgress 的 tag (ClassComponent/FunctionComponent等等有对应的处理方法)

```javascript
function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderExpirationTime: ExpirationTime,
) {
  // ...
    switch (workInProgress.tag) {
      case FunctionComponent: { //... }
      case ClassComponent: { //... }
      case HostComponent: { //... }
      // ...
    }
}
```
对于ClassComponent，会调用 updateClassComponent，创建实例挂载到stateNode，设置实例对应fiber的ReactInstanceMap map，设置实例的 props 更新state，触发生命周期。

接着创建子fiber，根据 element child的类型判断

- object: 一个节点

(reconcileSingleElement) 创建当前 子节点fiber 与它的子节点的关系 (child、return)
```javascript
function reconcileSingleElement(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    element: ReactElement,
    expirationTime: ExpirationTime,
  ): Fiber {
    const key = element.key;
    let child = currentFirstChild;
    while (child !== null) {
      // ...
    }

    if (element.type === REACT_FRAGMENT_TYPE) {
      // ... Fragment 处理逻辑
    } else {
      const created = createFiberFromElement(
        element,
        returnFiber.mode,
        expirationTime,
      );
      created.ref = coerceRef(returnFiber, currentFirstChild, element);
      created.return = returnFiber;
      return created;
    }
  }
```

- string/number: 文本节点 

(reconcileSingleTextNode) 创建文本节点fiber
```javascript
function reconcileSingleTextNode(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    textContent: string,
    expirationTime: ExpirationTime,
  ): Fiber {
    if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
      // ...
    }
    deleteRemainingChildren(returnFiber, currentFirstChild);
    const created = createFiberFromText(
      textContent,
      returnFiber.mode,
      expirationTime,
    );
    created.return = returnFiber;
    return created;
  }
```

- array: 多个字节点

(reconcileChildrenArray) 如果是多个子节点，还得确认子节点之间的 sibling关系

最后返回当前 fiber(workInProgress) 的 child 通过循环 performUnitOfWork 处理下一个子fiber

#### 7.(completeUnitOfWork) 直到 workInProgress 的 child 遍历完后(当前的workInProgress没有child,已经遍历到最深的子节点)开始调用completeWork回归

针对不同类型节点做不同操作

- HostText

创建DOM实例挂载到stateNode上，原来有stateNode则更新

- HostComponent

创建DOM实例挂载到stateNode上，原来有stateNode则更新
通过appendAllChildren将子fiber的stateNode上的DOM挂载在当前fiber的stateNode上，如果子fiber没有stateNode DOM(比如函数组件、类组件)则往下查找fiber
```javascript
appendAllChildren = function(
    parent: Instance,
    workInProgress: Fiber,
    needsVisibilityToggle: boolean,
    isHidden: boolean,
  ) {
    let node = workInProgress.child;
    while (node !== null) {
      if (node.tag === HostComponent || node.tag === HostText) {
        appendInitialChild(parent, node.stateNode);
      } else if (enableFundamentalAPI && node.tag === FundamentalComponent) {
        appendInitialChild(parent, node.stateNode.instance);
      } else if (node.tag === HostPortal) {
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      if (node === workInProgress) {
        return;
      }
      while (node.sibling === null) {
        if (node.return === null || node.return === workInProgress) {
          return;
        }
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  };
```
(setInitialDOMProperties) 更新dom props,根据 不同类型的prop做不同操作 (styles, dangerouslySetInnerHTML, children, 事件，autoFocus， 其他属性)
```javascript
function setInitialDOMProperties(
  tag: string,
  domElement: Element,
  rootContainerElement: Element | Document,
  nextProps: Object,
  isCustomComponentTag: boolean,
): void {
  for (const propKey in nextProps) {
    if (!nextProps.hasOwnProperty(propKey)) {
      continue;
    }
    const nextProp = nextProps[propKey];
    if (propKey === STYLE) {
      setValueForStyles(domElement, nextProp);
    } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
      const nextHtml = nextProp ? nextProp[HTML] : undefined;
      if (nextHtml != null) {
        setInnerHTML(domElement, nextHtml);
      }
    } else if (propKey === CHILDREN) {
      if (typeof nextProp === 'string') {
        const canSetTextContent = tag !== 'textarea' || nextProp !== '';
        if (canSetTextContent) {
          setTextContent(domElement, nextProp);
        }
      } else if (typeof nextProp === 'number') {
        setTextContent(domElement, '' + nextProp);
      }
    } else if (
      (enableDeprecatedFlareAPI && propKey === DEPRECATED_flareListeners) ||
      propKey === SUPPRESS_CONTENT_EDITABLE_WARNING ||
      propKey === SUPPRESS_HYDRATION_WARNING
    ) {
      // Noop
    } else if (propKey === AUTOFOCUS) {
    } else if (registrationNameModules.hasOwnProperty(propKey)) {
      if (nextProp != null) {
        ensureListeningTo(rootContainerElement, propKey);
      }
    } else if (nextProp != null) {
      setValueForProperty(domElement, propKey, nextProp, isCustomComponentTag);
    }
  }
}
```

在return上的父fiber上添加自己的 effect list，如果自身也有更新，也将自己挂载父fiber的 effect list上
```javascript
function completeUnitOfWork(unitOfWork: Fiber): void {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;

    if ((completedWork.effectTag & Incomplete) === NoEffect) {
			// ...

      if (
        returnFiber !== null &&
        // Do not append effects to parents if a sibling failed to complete
        (returnFiber.effectTag & Incomplete) === NoEffect
      ) {
        // Append all the effects of the subtree and this fiber onto the effect
        // list of the parent. The completion order of the children affects the
        // side-effect order.
        if (returnFiber.firstEffect === null) {
          returnFiber.firstEffect = completedWork.firstEffect;
        }
        if (completedWork.lastEffect !== null) {
          if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = completedWork.firstEffect;
          }
          returnFiber.lastEffect = completedWork.lastEffect;
        }
        const effectTag = completedWork.effectTag;
        if (effectTag > PerformedWork) {
          if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = completedWork;
          } else {
            returnFiber.firstEffect = completedWork;
          }
          returnFiber.lastEffect = completedWork;
        }
      }
    } else {
      
    }

		// ...
}
```


如果有 sibling 则赋值给 workInProgress， 继续进行 beginWork
如果连sibling 兄弟节点都没有，则回到父节点，继续查找它兄弟节点（叔叔），循环6、7过程，直到回到root

#### 8.commitRoot

commitRoot总共有3个阶段，分别遍历 effect list

1. before mutation

触发生命周期 如类组件的getSnapshotBeforeUpdate, HostRoot 会清空dom
```javascript
function commitBeforeMutationLifeCycles(
  current: Fiber | null,
  finishedWork: Fiber,
): void {
  switch (finishedWork.tag) {
    case ClassComponent: {
      if (finishedWork.effectTag & Snapshot) {
        if (current !== null) {
          const prevProps = current.memoizedProps;
          const prevState = current.memoizedState;
          const instance = finishedWork.stateNode;
          // We could update instance props and state here,
          // but instead we rely on them being set during last render.
          // TODO: revisit this when we implement resuming.
          const snapshot = instance.getSnapshotBeforeUpdate(
            finishedWork.elementType === finishedWork.type
              ? prevProps
              : resolveDefaultProps(finishedWork.type, prevProps),
            prevState,
          );
          instance.__reactInternalSnapshotBeforeUpdate = snapshot;
        }
      }
      return;
    }
    case HostRoot: {
      if (supportsMutation) {
        if (finishedWork.effectTag & Snapshot) {
          const root = finishedWork.stateNode;
          clearContainer(root.containerInfo);
        }
      }
      return;
    }
  }
}
```

2. mutation

根据不同的 Effect Tag 做不同操作
      Placement -> commitPlacement 替换，直接将子节点 appendChildToContainer 到父节点
      Update -> commitWork 根据不同tag做不同操作，HostComponent DOM实例更新props, HostText 更新新文本等
      Deletion -> commitDeletion 遍历子树的所有节点，卸载ref，触发componentWillUnmount卸载的生命周期，移除DOM

3. layout

触发类组件的componentDidMount生命周期，更新update queue，执行回调（setState的第二个回调参数）
原生DOM如果有autoFocus属性则focus

## setState & forceUpdate

setState 与 forceUpdate的流程与render大致相同，这里说明下不同点

#### 3.(scheduleUpdateOnFiber, performSyncWorkOnRoot) 开始调度

与初次render不同的是，setState forceUpdate的调度是可以中断的，模拟requestIdleCallback的功能可以根据浏览器渲染后的空闲时间以及任务优先级来控制调度

```javascript
if (expirationTime === Sync) {
    // Sync React callbacks are scheduled on a special internal queue
    callbackNode = scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
}
```
#### 

#### 4.(createWorkInProgress) 复用workInProgress

因为第一次选择创建了workInProgress并且更新完成后current的alternate指向workInProgress，所以这次可以复用workInProgress树，往后的所有更新都是可以在current和workInProgress相互复用

```javascript
export function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
	let workInProgress = current.alternate;
}
```
#### 

#### 5.(workLoopSync, performUnitOfWork) while循环 调用 performUnitOfWork 复用 workInProgress 的 子fiber

#### 6.beginWork

二次渲染会判断任务优先级，如果优先级不高则不会更新当前节点，再通过bailoutOnAlreadyFinishedWork函数对比子元素的优先级来判断是否跳过子树更新

```javascript
function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderExpirationTime: ExpirationTime,
): Fiber | null {
  if (current !== null) {
  	if (
      oldProps !== newProps ||
      hasLegacyContextChanged() ||
      (__DEV__ ? workInProgress.type !== current.type : false)
    ) {
      didReceiveUpdate = true;
    } else if (updateExpirationTime < renderExpirationTime) {
      didReceiveUpdate = false;
     	// ...
      return bailoutOnAlreadyFinishedWork(
        current,
        workInProgress,
        renderExpirationTime,
      );
    } else {
      didReceiveUpdate = false;
    }
  }
}
```

# hooks useState

hooks的流程在 6.beginWork 阶段开始的，当节点是FunctionComponent时，会调用updateFunctionComponent 方法，最后调用renderWithHooks来返回nextChildren。在renderWithHooks中会根据是否初次渲染来定义不同的hook

```javascript
const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  // ...
};

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  // ...
};

ReactCurrentDispatcher.current =
      current === null || current.memoizedState === null
        ? HooksDispatcherOnMount
        : HooksDispatcherOnUpdate;
```
可以看到在初次渲染时，useState实际是使用了mountState

```javascript

function mountState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  const hook = mountWorkInProgressHook();
  if (typeof initialState === 'function') {
    // $FlowFixMe: Flow doesn't like mixed types
    initialState = initialState();
  }
  hook.memoizedState = hook.baseState = initialState;
  const queue = (hook.queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: (initialState: any),
  });
  const dispatch: Dispatch<
    BasicStateAction<S>,
  > = (queue.dispatch = (dispatchAction.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ): any));
  return [hook.memoizedState, dispatch];
}
```
在mountState中，首先会创建workInProgressHook，就是当前的hook对象，与workInProgress类似，如果一个函数组件里多次调用了useState，则通过workInProgressHook.next 串联起来

```javascript
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,

    baseState: null,
    baseQueue: null,
    queue: null,

    next: null,
  };

  if (workInProgressHook === null) {
    // This is the first hook in the list
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // Append to the end of the list
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
```
在非初次渲染updateState实际上使用了updateReducer，与useReducer原理相同

```javascript
function updateState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  return updateReducer(basicStateReducer, (initialState: any));
}

function updateReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
    const hook = updateWorkInProgressHook();
		// ...
		const dispatch: Dispatch<A> = (queue.dispatch: any);
  	return [hook.memoizedState, dispatch];
}
```
这里使用了updateWorkInProgressHook来复用原先挂载在fiber.memoizedState的hook对象，多次使用useState则回去查找 hook.next，所以useState的调用顺序不能改变

最后useState返回数组的第二个dispatch，其实跟setState非常想，也是创建update对象，相互串联，挂载在queue.pending上，scheduleUpdateOnFiber 开启调度。
```javascript
function dispatchAction<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A,
) {
  const currentTime = requestCurrentTimeForUpdate();
  const suspenseConfig = requestCurrentSuspenseConfig();
  const expirationTime = computeExpirationForFiber(
    currentTime,
    fiber,
    suspenseConfig,
  );

  const update: Update<S, A> = {
    expirationTime,
    suspenseConfig,
    action,
    eagerReducer: null,
    eagerState: null,
    next: (null: any),
  };

  // Append the update to the end of the list.
  const pending = queue.pending;
  if (pending === null) {
    // This is the first update. Create a circular list.
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;

  // ...
    scheduleUpdateOnFiber(fiber, expirationTime);
  }
```
