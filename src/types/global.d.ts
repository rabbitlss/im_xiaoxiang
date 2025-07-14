// 全局类型声明文件

declare global {
  var require: any;
  
  namespace NodeJS {
    interface Global {
      require?: any;
    }
  }
}

export {};