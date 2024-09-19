import type { AWS } from '@serverless/typescript';
import { AwsLambdaRuntime } from '@serverless/typescript';
import packageJson from './package.json';
import { secretName } from './src/constants';

const serverlessConfiguration: AWS = {
  service: packageJson.name,
  frameworkVersion: '3',
  plugins: [
    'serverless-plugin-typescript',
    '@mridang/serverless-servestatic-plugin',
    '@mridang/serverless-checkov-plugin',
    '@mridang/serverless-shortsha-plugin',
    '@mridang/serverless-resourcetag-plugin',
    '@mridang/serverless-zipinfo-plugin',
  ],
  package: {
    individually: false,
    patterns: [
      'public/**/*',
      '**/*.hbs',
      '**/*.html',
      '!test',
      '!jest.config.js',
      '!jest.config.js.map',
      '!prettier.config.js',
      '!prettier.config.js.map',
      '!serverless.js',
      '!serverless.js.map',
      '!package.json',
    ],
  },
  provider: {
    stage: '${opt:stage, "dev"}',
    tags: {
      'sls:meta:project': packageJson.name,
      'sls:meta:repo': packageJson.repository.url,
      'sls:meta:environment': '${opt:stage, "dev"}',
    },
    environment: {
      NODE_OPTIONS: '--enable-source-maps',
      ACCOUNT_ID: '${aws:accountId}',
      NODE_ENV: '${self:provider.stage}',
      SERVICE_ID: packageJson.name,
      SERVICE_NAME: packageJson.name,
      SERVICE_TYPE: 'app',
      CLOUD_ACCOUNT_ID: '${aws:accountId}',
      CLOUD_AVAILABILITY_ZONE: '${aws:region}',
      CLOUD_PROVIDER: 'aws',
      CLOUD_REGION: '${aws:region}',
      CLOUD_SERVICE_NAME: 'lambda',
    },
    name: 'aws',
    logRetentionInDays: 14,
    tracing: {
      apiGateway: true,
      lambda: true,
    },
    runtime: `nodejs${packageJson.engines.node}` as AwsLambdaRuntime,
    architecture: 'arm64',
    memorySize: 256,
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['secretsmanager:GetSecretValue'],
            Resource: {
              'Fn::Join': [
                ':',
                [
                  'arn:aws:secretsmanager',
                  { Ref: 'AWS::Region' },
                  { Ref: 'AWS::AccountId' },
                  'secret',
                  `${secretName}-*`,
                ],
              ],
            },
          },
        ],
      },
    },
    logs: {
      restApi: {
        accessLogging: true,
        format: JSON.stringify({
          requestId: '$context.requestId',
          ip: '$context.identity.sourceIp',
          userAgent: '$context.identity.userAgent',
          httpMethod: '$context.httpMethod',
          resourcePath: '$context.resourcePath',
          status: '$context.status',
          responseLength: '$context.responseLength',
          errorMessage: '$context.error.message',
          integrationLatency: '$context.integrationLatency',
          responseTime: '$context.responseTime',
          tenantId: '$context.authorizer.clientId',
        }),
        executionLogging: true,
        level: 'INFO',
      },
    },
    apiGateway: {
      metrics: true,
      usagePlan: [
        {
          Unlimited: {
            throttle: {
              burstLimit: 5000,
              rateLimit: 2000,
            },
          },
        },
        {
          General: {
            quota: {
              limit: 86400,
              period: 'DAY',
            },
            throttle: {
              burstLimit: 1,
              rateLimit: 0.2,
            },
          },
        },
      ],
    },
  },
  resources: {
    extensions: {
      // ApiGatewayStage: {
      //   Properties: {
      //     MethodSettings: [
      //       {
      //         DataTraceEnabled: false,
      //         HttpMethod: '*',
      //         LoggingLevel: 'INFO',
      //         MetricsEnabled: true,
      //         ResourcePath: '/*',
      //       },
      //     ],
      //     TracingEnabled: true,
      //   },
      // },
      // ApiGatewayStage: {
      //   Properties: {
      //     AccessLogSetting: {
      //       DestinationArn: {
      //         'Fn::GetAtt': ['ApiGatewayLogGroup', 'Arn'],
      //       },
      //       Format:
      //         '{"requestId":"$context.requestId", "ip": "$context.identity.sourceIp", "requester":"$context.identity.user", "requestTime":"$context.requestTime", "httpMethod":"$context.httpMethod", "resourcePath":"$context.resourcePath", "status":"$context.status", "protocol":"$context.protocol", "responseLength":"$context.responseLength"}',
      //     },
      //   },
      // },
      ApiGatewayRestApi: {
        Properties: {
          Description: 'An API Gateway with custom API Key Source Type',
          ApiKeySourceType: 'AUTHORIZER',
        },
      },
    },
    Resources: {
      LambdaOriginAccessControl: {
        Type: 'AWS::CloudFront::OriginAccessControl',
        Properties: {
          OriginAccessControlConfig: {
            Name: `${packageJson.name}-\${self:provider.stage}-oac`,
            OriginAccessControlOriginType: 'lambda',
            SigningBehavior: 'always',
            SigningProtocol: 'sigv4',
          },
        },
      },
      TokensTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: 'Tokens',
          AttributeDefinitions: [
            { AttributeName: 'token', AttributeType: 'S' },
            { AttributeName: 'clientId', AttributeType: 'S' },
          ],
          KeySchema: [{ AttributeName: 'token', KeyType: 'HASH' }],
          BillingMode: 'PAY_PER_REQUEST',
          GlobalSecondaryIndexes: [
            {
              IndexName: 'ClientIdIndex',
              KeySchema: [{ AttributeName: 'clientId', KeyType: 'HASH' }],
              Projection: {
                ProjectionType: 'ALL',
              },
            },
          ],
        },
      },
      ApiGatewayLambdaInvokeRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  Service: 'apigateway.amazonaws.com',
                },
                Action: 'sts:AssumeRole',
              },
            ],
          },
          Policies: [
            {
              PolicyName: 'InvokeLambdaFunction',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: 'lambda:InvokeFunction',
                    Resource: {
                      'Fn::GetAtt': ['BasicAuthLambdaFunction', 'Arn'],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      APIGatewayAuthorizer: {
        Type: 'AWS::ApiGateway::Authorizer',
        Properties: {
          Name: 'BasicAuthAuthorizer',
          Type: 'TOKEN',
          IdentitySource: 'method.request.header.Authorization',
          RestApiId: {
            Ref: 'ApiGatewayRestApi',
          },
          AuthorizerUri: {
            'Fn::Join': [
              '',
              [
                'arn:aws:apigateway:',
                { Ref: 'AWS::Region' },
                ':lambda:path/2015-03-31/functions/',
                { 'Fn::GetAtt': ['BasicAuthLambdaFunction', 'Arn'] },
                '/invocations',
              ],
            ],
          },
          AuthorizerCredentials: {
            'Fn::GetAtt': ['ApiGatewayLambdaInvokeRole', 'Arn'],
          },
          AuthorizerResultTtlInSeconds: 30,
        },
      },
      BasicAuthLambdaFunction: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          Architectures: ['arm64'],
          Code: {
            ZipFile: `
              const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
              const crypto = require('crypto');  // It's better to require modules at the top.

              // Initialize DynamoDB Client
              const dynamoDbClient = new DynamoDBClient({ region: 'us-east-1' });

              exports.handler = async (event) => {
                const token = event.authorizationToken;
                const hashedToken = hashToken(token);

                try {
                  // GetItem from DynamoDB using v3 SDK
                  const getParams = {
                    TableName: 'Tokens',
                    Key: {
                      'token': { S: hashedToken }
                    }
                  };
                  const { Item } = await dynamoDbClient.send(new GetItemCommand(getParams));

                  if (Item) {
                    const updateParams = {
                      TableName: 'Tokens',
                      Key: { 'token': { S: hashedToken } },
                      UpdateExpression: 'set lastUsed = :now',
                      ExpressionAttributeValues: {
                        ':now': { S: new Date().toISOString() }
                      }
                    };
                    await dynamoDbClient.send(new UpdateItemCommand(updateParams));

                    const contextAttributes = {
                      clientId: Item.clientId.S
                    };
                    return generatePolicy('user', 'Allow', event.methodArn, Item.clientId.S, contextAttributes);
                  } else {
                    return generatePolicy('user', 'Deny', event.methodArn);
                  }
                } catch (error) {
                  console.error('Error:', error);
                  return generatePolicy('user', 'Deny', event.methodArn);
                }
              };

              function hashToken(token) {
                return crypto.createHash('sha256').update(token).digest('hex');
              }

              function generatePolicy(principalId, effect, resource, apiKey, contextAttributes = {}) {
                return {
                  principalId,
                  policyDocument: {
                    Version: '2012-10-17',
                    Statement: [{
                      Action: 'execute-api:Invoke',
                      Effect: effect,
                      Resource: resource
                    }]
                  },
                  usageIdentifierKey: apiKey,
                  context: contextAttributes
                };
              }
            `,
          },
          Handler: 'index.handler',
          Runtime: `nodejs${packageJson.engines.node}` as AwsLambdaRuntime,
          Role: {
            'Fn::GetAtt': ['LambdaExecutionRole', 'Arn'],
          },
        },
      },
      LambdaExecutionRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  Service: 'lambda.amazonaws.com',
                },
                Action: 'sts:AssumeRole',
              },
            ],
          },
          Policies: [
            {
              PolicyName: 'MyLambdaPolicy',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: [
                      'logs:CreateLogGroup',
                      'logs:CreateLogStream',
                      'logs:PutLogEvents',
                    ],
                    Resource: 'arn:aws:logs:*:*:*',
                  },
                  {
                    Effect: 'Allow',
                    Action: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
                    Resource: [{ 'Fn::GetAtt': ['TokensTable', 'Arn'] }],
                  },
                ],
              },
            },
          ],
        },
      },
      LambdaInvokePermission: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: {
            'Fn::GetAtt': ['BasicAuthLambdaFunction', 'Arn'],
          },
          Action: 'lambda:InvokeFunction',
          Principal: 'apigateway.amazonaws.com',
          SourceArn: {
            'Fn::Sub':
              'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiGatewayRestApi}/*/*/*',
          },
        },
      },
    },
  },
  functions: {
    demo: {
      handler: 'src/lambda.handler',
      events: [
        {
          httpApi: {
            method: '*',
            path: '/{proxy+}',
          },
        },
      ],
      timeout: 60,
    },
    restful: {
      handler: 'src/lambda.handler',
      events: [
        {
          http: {
            method: 'ANY',
            path: 'health',
            cors: true,
            private: true,
            authorizer: {
              type: 'TOKEN',
              authorizerId: {
                Ref: 'APIGatewayAuthorizer',
              },
            },
          },
        },
      ],
      timeout: 60,
    },
  },
};

module.exports = serverlessConfiguration;
