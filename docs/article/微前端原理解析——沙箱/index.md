
沙箱在微前端中起到隔离全局变量污染的作用，如果没有隔离子应用的全局变量可能跟主应用的冲突，造成污染。下面介绍下qiankun中3中沙箱的实现

## SnapshotSandbox

SnapshotSandbox 为快照沙箱，用于不支持 Proxy 的低版本浏览器

```typescript
export default class SnapshotSandbox implements SandBox {
  proxy: WindowProxy;

  name: string;

  type: SandBoxType;

  sandboxRunning = true; // 当前沙箱是否激活

  private windowSnapshot!: Window; // window 状态快照

  private modifyPropsMap: Record<any, any> = {}; // 沙箱运行期间被修改过的 window 属性

  constructor(name: string) {
    this.name = name; // 沙箱名称
    this.proxy = window; // 代理对象，此处为 window 对象
    this.type = SandBoxType.Snapshot;
  }

  active() { // 激活
    // ...
  }

  inactive() { // 关闭
    // ...
  }
}
```

当应用激活时，先给当前window对象记录快照，然后遍历modifyPropsMap，还原之前沙箱运行环境（之前对window的修改）

```typescript
active() {
    // 记录当前快照
    this.windowSnapshot = {} as Window;
    iter(window, (prop) => {
      this.windowSnapshot[prop] = window[prop];
    });

    // 恢复之前的变更
    Object.keys(this.modifyPropsMap).forEach((p: any) => {
      window[p] = this.modifyPropsMap[p];
    });

    this.sandboxRunning = true;
  }
```

当应用关闭时，用modifyPropsMap记录变更后的window对象，然后将window还原

```typescript
inactive() {
    this.modifyPropsMap = {};

    iter(window, (prop) => {
      if (window[prop] !== this.windowSnapshot[prop]) {
        // 记录变更，恢复环境
        this.modifyPropsMap[prop] = window[prop];
        window[prop] = this.windowSnapshot[prop];
      }
    });

    this.sandboxRunning = false;
  }
```

SnapshotSandbox 沙箱就是利用快照实现了对 window 对象状态隔离的管理，是对于不支持Proxy浏览器的兼容

## SingularProxySandbox

SingularProxySandbox是利用Proxy在单例模式下的沙箱，实现原理是劫持记录对window的操作，储存新增、修改的值，在应用激活、关闭时还原、设置变量。

```typescript
export default class SingularProxySandbox implements SandBox {
  /** 沙箱期间新增的全局变量 */
  private addedPropsMapInSandbox = new Map<PropertyKey, any>();

  /** 沙箱期间更新的全局变量 */
  private modifiedPropsOriginalValueMapInSandbox = new Map<PropertyKey, any>();

  /** 持续记录更新的(新增和修改的)全局变量的 map，用于在任意时刻做 snapshot */
  private currentUpdatedPropsValueMap = new Map<PropertyKey, any>();

  name: string;

  proxy: WindowProxy;

  type: SandBoxType;

  sandboxRunning = true;

  active() {
    // ...
  }

  inactive() {
    // ...
  }

  constructor(name: string) {
    this.name = name;
    this.type = SandBoxType.LegacyProxy;
    const { addedPropsMapInSandbox, modifiedPropsOriginalValueMapInSandbox, currentUpdatedPropsValueMap } = this;

    const self = this;
    const rawWindow = window;
    const fakeWindow = Object.create(null) as Window;

    const proxy = new Proxy(fakeWindow, {
      set(_: Window, p: PropertyKey, value: any): boolean {
        if (self.sandboxRunning) {
          if (!rawWindow.hasOwnProperty(p)) {
            addedPropsMapInSandbox.set(p, value); // 记录新增值
          } else if (!modifiedPropsOriginalValueMapInSandbox.has(p)) {
            // 如果当前 window 对象存在该属性，且 record map 中未记录过，则记录该属性初始值
            const originalValue = (rawWindow as any)[p];
            modifiedPropsOriginalValueMapInSandbox.set(p, originalValue); // 记录修改值
          }

          currentUpdatedPropsValueMap.set(p, value);
          // 必须重新设置 window 对象保证下次 get 时能拿到已更新的数据
          (rawWindow as any)[p] = value;

          return true;
        }
        return true;
      },

      get(_: Window, p: PropertyKey): any {
        if (p === 'top' || p === 'parent' || p === 'window' || p === 'self') {
          return proxy;
        }
        const value = (rawWindow as any)[p];
        return getTargetValue(rawWindow, value);
      },

      // trap in operator
      // see https://github.com/styled-components/styled-components/blob/master/packages/styled-components/src/constants.js#L12
      has(_: Window, p: string | number | symbol): boolean {
        return p in rawWindow;
      },
    });

    this.proxy = proxy;
  }
}
```
在应用激活时，遍历应用之前更新、新增的值还原到window上

```typescript
active() {
    if (!this.sandboxRunning) {
      this.currentUpdatedPropsValueMap.forEach((v, p) => setWindowProp(p, v));
    }
    this.sandboxRunning = true;
 }
```
在应用关闭时，还原修改的变量以及删除应用新增的变量

```typescript
inactive() {
    this.modifiedPropsOriginalValueMapInSandbox.forEach((v, p) => setWindowProp(p, v));
    this.addedPropsMapInSandbox.forEach((_, p) => setWindowProp(p, undefined, true));

    this.sandboxRunning = false;
}
```

## ProxySandbox

ProxySandbox 多实例沙箱也是利用了Proxy，与单例沙箱不同的是，它并不会直接修改window的值，而是代理到一个Set updatedValueSet，记录当前应用对全局变量的修改。当需要获取值时，先去找代理的fakeWindow，找不到则会在window上查询

```typescript
export default class ProxySandbox implements SandBox {
  /** window 值变更记录 */
  private updatedValueSet = new Set<PropertyKey>();

  name: string;

  type: SandBoxType;

  proxy: WindowProxy;

  sandboxRunning = true;

  constructor(name: string) {
    this.name = name;
    this.type = SandBoxType.Proxy;
    const { updatedValueSet } = this;

    const self = this;
    const rawWindow = window;
    const { fakeWindow, propertiesWithGetter } = createFakeWindow(rawWindow);

    const descriptorTargetMap = new Map<PropertyKey, SymbolTarget>();
    const hasOwnProperty = (key: PropertyKey) => fakeWindow.hasOwnProperty(key) || rawWindow.hasOwnProperty(key);

    const proxy = new Proxy(fakeWindow, {
      set(target: FakeWindow, p: PropertyKey, value: any): boolean {
        if (self.sandboxRunning) {
          // @ts-ignore
          target[p] = value;
          updatedValueSet.add(p); // 记录修改

          if (variableWhiteList.indexOf(p) !== -1) {
            // @ts-ignore
            rawWindow[p] = value;
          }

          return true;
        }
        return true;
      },

      get(target: FakeWindow, p: PropertyKey): any {
        if (p === Symbol.unscopables) return unscopables;
        if (p === 'window' || p === 'self') {
          return proxy;
        }

        if (
          p === 'top' ||
          p === 'parent' ||
          (process.env.NODE_ENV === 'test' && (p === 'mockTop' || p === 'mockSafariTop'))
        ) {
          // if your master app in an iframe context, allow these props escape the sandbox
          if (rawWindow === rawWindow.parent) {
            return proxy;
          }
          return (rawWindow as any)[p];
        }

        // proxy.hasOwnProperty would invoke getter firstly, then its value represented as rawWindow.hasOwnProperty
        if (p === 'hasOwnProperty') {
          return hasOwnProperty;
        }

        // mark the symbol to document while accessing as document.createElement could know is invoked by which sandbox for dynamic append patcher
        if (p === 'document') {
          documentAttachProxyMap.set(document, proxy);
          nextTick(() => documentAttachProxyMap.delete(document));
          return document;
        }

        // eslint-disable-next-line no-bitwise
        const value = propertiesWithGetter.has(p) ? (rawWindow as any)[p] : (target as any)[p] || (rawWindow as any)[p];
        return getTargetValue(rawWindow, value);
      },
    });

    this.proxy = proxy;
  }
}
```
相比较而言，ProxySandbox 是最完备的沙箱模式，完全隔离了对 window 对象的操作，也解决了快照模式中子应用运行期间仍然会对 window 造成污染的问题。
