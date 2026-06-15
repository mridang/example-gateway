export default {
  entry: ['serverless.ts'],
  ignore: ['knip.config.ts'],
  ignoreDependencies: [
    /^@semantic-release\//,
    /^@mridang\/serverless-/,
    /^preact$/,
  ],
};
