// 简单的编译检查脚本
const fs = require('fs');
const path = require('path');

console.log('🔍 检查项目编译状态...\n');

// 检查关键文件是否存在
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'App.tsx',
  'src/types/index.ts',
  'src/services/index.ts',
  'src/store/index.ts',
  'src/utils/index.ts'
];

console.log('📁 检查文件结构:');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// 检查package.json配置
console.log('\n📦 检查依赖配置:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredDeps = [
    'expo',
    'react',
    'react-native',
    '@react-navigation/native',
    '@react-navigation/bottom-tabs',
    'expo-sqlite',
    '@react-native-async-storage/async-storage',
    'expo-secure-store',
    'jsonwebtoken',
    'jwt-decode',
    'yup',
    'ws',
    'expo-document-picker',
    'expo-image-picker',
    'expo-file-system',
    'expo-notifications',
    'uuid',
    'crypto-js',
    '@sentry/react-native'
  ];
  
  requiredDeps.forEach(dep => {
    const exists = packageJson.dependencies && packageJson.dependencies[dep];
    console.log(`  ${exists ? '✅' : '❌'} ${dep}`);
  });
  
} catch (error) {
  console.log('  ❌ package.json 读取失败');
  allFilesExist = false;
}

// 检查TypeScript配置
console.log('\n⚙️ 检查TypeScript配置:');
try {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  console.log('  ✅ tsconfig.json 配置正常');
  console.log(`  📝 编译目标: ${tsConfig.compilerOptions?.target || 'default'}`);
  console.log(`  📝 模块解析: ${tsConfig.compilerOptions?.moduleResolution || 'default'}`);
} catch (error) {
  console.log('  ❌ tsconfig.json 配置有误');
  allFilesExist = false;
}

// 检查项目结构
console.log('\n🏗️ 检查项目结构:');
const directories = ['src', 'src/components', 'src/screens', 'src/navigation', 'src/types', 'src/utils', 'src/services', 'src/store'];
directories.forEach(dir => {
  const exists = fs.existsSync(path.join(__dirname, dir));
  console.log(`  ${exists ? '✅' : '❌'} ${dir}/`);
});

console.log('\n🎯 编译状态总结:');
if (allFilesExist) {
  console.log('✅ 项目结构完整，可以尝试编译');
  console.log('\n🚀 下一步操作:');
  console.log('  1. 安装依赖: npm install');
  console.log('  2. 启动开发服务器: npm start');
  console.log('  3. 选择平台运行应用');
} else {
  console.log('❌ 项目结构不完整，需要修复缺失的文件');
}

console.log('\n📊 项目统计:');
const srcFiles = getAllFiles('src').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
console.log(`  📄 TypeScript文件: ${srcFiles.length} 个`);
console.log(`  📁 总目录数: ${directories.filter(d => fs.existsSync(d)).length} 个`);

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}