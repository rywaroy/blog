import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "blog",
  description: "my blog",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
    ],

    sidebar: [
      {
        text: '使用大语言模型 API 搭建个人 AI 助理',
        link: '/article/使用大语言模型 API 搭建个人 AI 助理/'
      },
      {
        text: '探索 AIGC 在模板代码上的应用',
        link: '/article/探索 AIGC 在模板代码上的应用/'
      },
      {
        text: 'KMP算法及其在项目中的应用',
        link: '/article/KMP算法及其在项目中的应用/'
      },
      {
        text: '富文本编辑器动态虚拟滚动方案',
        link: '/article/富文本编辑器动态虚拟滚动方案/'
      },
      {
        text: '语音转写富文本编辑器的设计',
        link: '/article/语音转写富文本编辑器的设计/'
      },
      {
        text: '使用 Vue3 Composition API 进行逻辑复用',
        link: '/article/使用 Vue3 Composition API 进行逻辑复用/'
      },
      {
        text: '关于 Webpack source map 的一些事',
        link: '/article/关于 Webpack source map 的一些事/'
      },
      {
        text: '利用 WebAssembly 优化音频波形数据计算',
        link: '/article/利用 WebAssembly 优化音频波形数据计算/'
      },
      {
        text: '音频波形的渲染优化',
        link: '/article/音频波形的渲染优化/'
      },
      {
        text: '我所理解的复用',
        link: '/article/我所理解的复用/'
      },
      {
        text: '从React源码来看各个性能优化方案的原理',
        link: '/article/从React源码来看各个性能优化方案的原理/'
      },
      {
        text: 'React渲染主流程解析',
        link: '/article/React渲染主流程解析/'
      },
      {
        text: '在频繁请求大数据量接口场景下的优化',
        link: '/article/在频繁请求大数据量接口场景下的优化/'
      },
      {
        text: '为什么我使用hooks',
        link: '/article/为什么我使用hooks/'
      },
      {
        text: '微前端原理解析——沙箱',
        link: '/article/微前端原理解析——沙箱/'
      },
      {
        text: '微前端原理解析——生命周期',
        link: '/article/微前端原理解析——生命周期/'
      },
      {
        text: '微前端原理解析——html-loader',
        link: '/article/微前端原理解析——html-loader/'
      },
      {
        text: 'qiankun微前端实践',
        link: '/article/qiankun微前端实践/'
      },
      {
        text: 'Javascript设计模式',
        link: '/article/javascript-design-patterns/'
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rywaroy' }
    ]
  }
})
