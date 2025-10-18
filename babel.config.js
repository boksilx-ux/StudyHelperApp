// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Reanimated 플러그인은 반드시 '마지막'에 위치
    'react-native-reanimated/plugin',
  ],
};
