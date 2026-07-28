import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, DYNAMODB_TABLE_NAME, isDynamoConfigured } from '../../../services/dynamoClient';

// Simple in-memory storage fallback for local development if AWS credentials are not set
interface RunMetadata {
  runId: string;
  timestamp: number;
  resumesCount: number;
  modelsCount: number;
  resumesList: string[];
  status: string;
}

interface RunDetail extends RunMetadata {
  results: any[];
}

let localMemoryRuns: RunDetail[] = [];

// GET /api/runs
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');

  try {
    if (runId) {
      // 1. Fetch full detailed run
      if (!isDynamoConfigured || !docClient) {
        const localRun = localMemoryRuns.find((r) => r.runId === runId);
        if (!localRun) {
          return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, run: localRun });
      }

      const getResult = await docClient.send(
        new GetCommand({
          TableName: DYNAMODB_TABLE_NAME,
          Key: { runId },
        })
      );

      if (!getResult.Item) {
        return NextResponse.json({ error: 'Run not found in DynamoDB' }, { status: 404 });
      }

      return NextResponse.json({ success: true, run: getResult.Item });
    } else {
      // 2. Fetch list of runs (metadata only, ordered by newest first)
      if (!isDynamoConfigured || !docClient) {
        // Return local in-memory runs list (newest first)
        const localList = localMemoryRuns.map(({ results, ...meta }) => meta);
        const sortedLocal = [...localList].sort((a, b) => b.timestamp - a.timestamp);
        return NextResponse.json({ success: true, runs: sortedLocal });
      }

      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: DYNAMODB_TABLE_NAME,
          ProjectionExpression: 'runId, #ts, resumesCount, modelsCount, resumesList, #st',
          ExpressionAttributeNames: {
            '#ts': 'timestamp',
            '#st': 'status',
          },
        })
      );

      const items = (scanResult.Items || []) as RunMetadata[];
      const sortedItems = items.sort((a, b) => b.timestamp - a.timestamp);

      return NextResponse.json({ success: true, runs: sortedItems });
    }
  } catch (err: any) {
    console.error('Error in GET /api/runs:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/runs
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { results, resumesList, resumesCount, modelsCount } = body;

    if (!results || !Array.isArray(results)) {
      return NextResponse.json({ error: 'Missing results array' }, { status: 400 });
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const timestamp = Date.now();
    const status = 'SUCCESS';

    const newRun: RunDetail = {
      runId,
      timestamp,
      resumesCount: resumesCount || resumesList?.length || 0,
      modelsCount: modelsCount || 0,
      resumesList: resumesList || [],
      status,
      results,
    };

    // Save to local memory for fallback
    localMemoryRuns.push(newRun);
    if (localMemoryRuns.length > 50) {
      localMemoryRuns.shift(); // Keep last 50 runs in memory limit
    }

    // Save to live DynamoDB if configured
    if (isDynamoConfigured && docClient) {
      await docClient.send(
        new PutCommand({
          TableName: DYNAMODB_TABLE_NAME,
          Item: newRun,
        })
      );
      console.log(`Saved run ${runId} to AWS DynamoDB successfully.`);
    }

    return NextResponse.json({
      success: true,
      runId,
      timestamp,
      savedToDynamo: isDynamoConfigured,
    });
  } catch (err: any) {
    console.error('Error in POST /api/runs:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
