
## 工厂模式

工厂模式就是将创建对象的过程单独封装，开发者不用关心工厂里是怎么去创建对象的，只需传入对象对应的参数，来获取新的实例对象。

比如在动物园里，需要有大量的动物，需要创建一个个动物的实例。我们可以封装一个 createAnimal 工厂函数来帮助我们创建动物实例。
```typescript
class Animal {
  name: string;
 
	constructor(name: string) {
  	this.name = name;
  }
}

function createAnimal(name: string): Animal {
	return new Animal(name);
}

const dog = createAnimal('dog');
const cat = createAnimal('cat');
```
当然在动物园还需要些植物，我们还可以改造工厂函数去创建植物的实例。
```typescript
class Animal {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

class Plant {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

function create(type: string, name: string): Animal | Plant {
  switch (type) {
    case 'animal':
      return new Animal(name);
    case 'plant':
      return new Plant(name);
    default:
      return new Animal(name);
  }
}

const dog = create('animal', 'dog');
const rose = create('plant', 'rose');
```
以上的简单例子比较好理解，当我们需要去大量创建实例，调用大量的 new 时就可能会用到工厂模式。将创建对象的过程单独封装，这样的操作就是工厂模式。

**例子**

**jQuery**<br />**<br />当我们使用jQuery时，一直都是 $('selector') 没有 new $('selector') 吧。这里摘抄了jQuery部分源码，可以看到当调用了$方法后，实际上调用的是jQuery原型上创建实例的init方法，所以我们使用jQuery时并不需要每次都new 一个新的jQuery对象。
```javascript
(function( global, factory ) {
	// ...
})(typeof window !== "undefined" ? window : this, function(window, noGlobal) {
	var jQuery = function(selector, context) {

    // The jQuery object is actually just the init constructor 'enhanced'
    // Need init if jQuery is called (just allow error to be thrown if not included)
    return new jQuery.fn.init(selector, context);
  }
  
  jQuery.fn = jQuery.prototype = {
  	// ...
  }
  
  window.jQuery = window.$ = jQuery;
  
  return jQuery;
})


```

**React.createElement**

babel解析jsx会使用 React.createElement 的工厂函数来创建vnode实例，并没有直接去 new 一个vnode
```javascript
const jsx = (
	<div id="app">
    	<h2>title</h2>
    	<p>content</p>
    	<span>text</span>
  	</div>
);

var jsx = React.createElement(
  "div", 
  {id: "app"}, 
  React.createElement("h2", null, "title"),
  React.createElement("p", null, "content"),
  React.createElement("span", null, "text")
);
```

这里再放一段 createElement 函数的伪代码
```javascript
function Vnode(tag, attr, children) {
	// ...
}

React.createElement = function(tag, attr, children) {
	// ...
  return new Vnode(tag, attr, children);
}
```

<a name="YmlPu"></a>
## 单例模式

单例模式就是在系统只被唯一使用，一个类只有一个实例。一般情况下一个构造函数可以new多个实例对象，并且这多个实例对象都是相对独立的，各自占一个内存空间，所以我们每次创建实例，都会返回唯一的实例对象。但是在单例模式中，每次创建实例都会返回同一个实例对象，一个构造函数有且只能构造出一个实例。

这里利用TypeScript来实现一个单例

```typescript
class Animal {
  name: string;

  private static instance: Animal;

  private constructor(name: string) {
    this.name = name;
  }

  static getInstance(name: string) {
    if (!(this.instance instanceof Animal)) {
      this.instance = new Animal(name);
    }
    return this.instance;
  }
}

const dog = Animal.getInstance('dog');
const cat = Animal.getInstance('cat');
console.log(dog); // Animal { name: 'dog' }
console.log(cat); // Animal { name: 'dog' }
console.log(dog === cat); // true
```

上述代码中，分别使用 Animal 类中静态函数 getInstance 创建了2个实例 dog cat，但本质上 dog 与 cat 是相同的一个实例。

**例子**

**Vuex**<br />**<br />在vue中，各个组件都是相互独立的，父子组件通过props来传递信息进行通信。如果是兄弟组件之前的通信，也可以先与父组件通信，再通知兄弟组件。一旦组件之间嵌套比较深，关系复杂，这种通信方式会显得更加复杂，难以维护。而Vuex会将数据抽离出来，放到全局，各个组件可以直接获取、修改全局数据。全局的数据源就是Store，而创建Store时就得必须保证Store的唯一性。

```javascript
// 安装vuex插件
Vue.use(Vuex);

// ...一些添加、修改store数据操作
Vue.use(Vuex);

// 将store注入到Vue实例中
new Vue({
    el: '#app',
    store,
});
```

上述代码中，如果安装了Vuex插件后，对store的数据进行了添加和修改，又再次安装Vuex插件那么注入的store会被重置吗？<br />结论当然是不会的，来看下Vuex是怎么做的

```javascript
// store.js 

let Vue // bind on install

export function install (_Vue) {
  if (Vue && _Vue === Vue) {
    if (__DEV__) {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue)
}
```
store.js内部创建了一个叫Vue的变量，来保存Vue对象，当调用了Vue.use方法，调用Vuex的install方法后，会把Vue对象赋值给Vue变量，如果多次调用install，判断Vue变量存在则直接return。通过这种方式，可以保证一个 Vue 实例只会被 install 一次 Vuex 插件，所以每个 Vue 实例只会拥有一个全局的 Store。

<a name="HWdy9"></a>
## 适配器模式


适配器模式又称包装器模式,将一个类的接口转化为用户需要的另一个接口,解决类(对象)之间接口不兼容的问题。

比如我们国家使用的是220V电压，在日本使用的是100V电压，那我们去日本旅游在手机充电时就需要接一个适配器，将100V电压转为220V，供手机正常充电。

```typescript
class Socket {
    output() {
        return '输出100V';
    }
}

class PowerAdapter {
  	socket: Socket;
  	
    constructor(socket: Socket) {
        this.socket = socket;
    }
    //转换后的接口和转换前不一样
    charge() {
        return this.socket.output() + ' 经过转换 输出220V';
    }
}
let powerAdapter = new PowerAdapter(new Socket());
console.log(powerAdapter.charge());
```
其中这个PowerAdapter类就充当适配器，将电压转化为220V。

假如有一个jQuery的老项目要用React进行重构，里面使用了大量的 $.ajax 请求，我们准备使用axios来进行替换，那应该怎么做？搜索全局替换？$.ajax 与 axios 的参数也不完全相同，这里最好做一层适配

```typescript
const $ = {
	ajax: (options: Options) => {
  	return toAxiosAdapter(options);
  }
}

function toAxiosAdapter(options: Options) {
    return axios({
        url: options.url,
        method: options.type
    });
}
```

<a name="u0tfE"></a>
## 装饰器模式

装饰器模式就是能为对象添加新功能而又不改变原有的结构和功能的模式。最典型的就是ES7的Decorator

```typescript
interface extra {
  run: () => void;
}

function descriptor<T extends { new(...args: any[]): {} }>(constructor: T) {
  return class extends constructor implements extra {
    run() {
      console.log('run');
    }
  };
}

@descriptor
class Animal {

}

const animal = new Animal() as Animal & extra;
animal.run(); // run
```
这里 descriptor 装饰器为 Animal 类添加了 run 方法。

同时装饰器还可以为函数、属性装饰

```typescript
function descriptor(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function () {
    console.log('before run');
    return originalMethod.apply(this, arguments);
  };
  return descriptor;
}

function readonly(target: any, propertyKey: string) {
  const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);

  Object.defineProperty(target, propertyKey, {
    ...descriptor,
    writable: false,
    value: descriptor?.value,
  });

  return target;
}

class Animal {
  @readonly
  static eyes = 'eyes';

  @descriptor
  run() {
    console.log('run');
  }
}

const animal = new Animal();
animal.run();
// before run
// run
Animal.eyes = '';
console.log(Animal.eyes); // eyes
```

在上述代码中有两个装饰器 descriptor readonly ，一个为 run 方法添加前置的log方法，另一个对Animal类的静态属性eyes进行劫持，使得无法修改。
