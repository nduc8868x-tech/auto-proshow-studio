import { config } from "@remotion/eslint-config-flat";
export default [
  ...config,
  {
    files: ["src/App.tsx", "src/components/*.tsx"],
    rules: { "@remotion/warn-native-media-tag": "off" },
  },
];
