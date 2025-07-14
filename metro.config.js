const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 配置路径解析
config.resolver.alias = {
  '@': './src',
  '@/components': './src/components',
  '@/screens': './src/screens',
  '@/navigation': './src/navigation',
  '@/types': './src/types',
  '@/utils': './src/utils',
  '@/services': './src/services',
  '@/store': './src/store'
};

module.exports = config;