import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-1';

export const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'ai-model-evaluator-runs';

// Check if credentials exist to decide if we run in live DynamoDB mode or local fallback mode
export const isDynamoConfigured = !!(accessKeyId && secretAccessKey);

let ddbClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;

if (isDynamoConfigured) {
  try {
    ddbClient = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });

    docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });
    console.log('DynamoDB client initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize DynamoDB client:', err);
  }
} else {
  console.warn('AWS credentials not found. DynamoDB running in local state-only mock mode.');
}

export { docClient };
