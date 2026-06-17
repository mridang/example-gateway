export default {
  entry: ['serverless.ts'],
  ignoreDependencies: [
    /^@semantic-release\//,
    /^@mridang\/serverless-/,
    /^preact$/,
    'aws-lambda',
  ],
};
