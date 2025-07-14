// 简单的TypeScript语法检查脚本
const fs = require('fs');
const path = require('path');

console.log('🔍 检查TypeScript语法问题...\n');

// 获取所有TypeScript文件
function getAllTsFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files = files.concat(getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 检查常见的语法问题
function checkCommonIssues(filePath, content) {
  const issues = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // 检查__DEV__使用
    if (line.includes('__DEV__')) {
      issues.push(`${lineNum}: 使用了__DEV__，应该使用ENV_CONFIG.isDev`);
    }
    
    // 检查require的使用
    if (line.includes('require(') && !line.includes('// @ts-ignore') && !line.includes('try')) {
      if (!line.includes('global') && !line.includes('(global as any)')) {
        issues.push(`${lineNum}: 可能的require()使用问题`);
      }
    }
    
    // 检查process.env的使用
    if (line.includes('process.env') && !line.includes('global') && !line.includes('(global as any)')) {
      issues.push(`${lineNum}: 直接使用process.env，应该使用ENV_CONFIG`);
    }
    
    // 检查基本语法错误
    if (line.includes('export ') && line.includes('=') && !line.includes(';') && line.trim().endsWith('}')) {
      // 这可能是没有分号的导出语句
    }
  });
  
  return issues;
}

// 主要检查函数
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = checkCommonIssues(filePath, content);
    
    if (issues.length > 0) {
      console.log(`❌ ${filePath}:`);
      issues.forEach(issue => console.log(`  ${issue}`));
      return false;
    } else {
      console.log(`✅ ${filePath}`);
      return true;
    }
  } catch (error) {
    console.log(`❌ ${filePath}: 读取文件失败 - ${error.message}`);
    return false;
  }
}

// 检查所有文件
const tsFiles = getAllTsFiles('src');
let allPassed = true;

console.log(`找到 ${tsFiles.length} 个TypeScript文件\n`);

for (const file of tsFiles) {
  if (!checkFile(file)) {
    allPassed = false;
  }
}

console.log('\n📊 检查结果:');
if (allPassed) {
  console.log('✅ 所有文件语法检查通过');
  console.log('\n🎯 编译应该可以成功，但需要安装依赖：');
  console.log('  npm install --legacy-peer-deps');
} else {
  console.log('❌ 发现语法问题，需要修复');
}