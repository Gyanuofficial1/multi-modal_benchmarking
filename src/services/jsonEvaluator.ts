import { JsonAccuracyReport, JsonDiffDetail } from '../types/benchmark';

// Helper for string similarity calculation (Levenshtein Distance)
function computeStringSimilarity(str1: string, str2: string): number {
  const s1 = String(str1).trim().toLowerCase();
  const s2 = String(str2).trim().toLowerCase();

  if (s1 === s2) return 100;
  if (!s1.length || !s2.length) return 0;

  // Substring inclusion check for resumes (e.g. "Software Developer" in "Senior Software Developer")
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return Math.round((minLen / maxLen) * 95);
  }

  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null)
  );

  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = track[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  const similarity = ((maxLen - distance) / maxLen) * 100;
  return Math.max(0, Math.round(similarity));
}

// Flatten nested JSON into path-value pairs
function flattenJson(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};

  if (obj === null || obj === undefined) {
    result[prefix] = obj;
    return result;
  }

  if (typeof obj !== 'object') {
    result[prefix] = obj;
    return result;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result[prefix] = [];
    } else {
      obj.forEach((item, index) => {
        const path = prefix ? `${prefix}[${index}]` : `[${index}]`;
        if (typeof item === 'object' && item !== null) {
          Object.assign(result, flattenJson(item, path));
        } else {
          result[path] = item;
        }
      });
    }
    return result;
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) {
    result[prefix] = {};
  } else {
    keys.forEach((key) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        Object.assign(result, flattenJson(obj[key], path));
      } else {
        result[path] = obj[key];
      }
    });
  }

  return result;
}

// Compare array values (e.g. skill arrays) ignoring order
function compareArraySimilarity(arr1: any[], arr2: any[]): number {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return 0;
  if (arr1.length === 0 && arr2.length === 0) return 100;

  const set1 = new Set(arr1.map(x => String(x).toLowerCase().trim()));
  const set2 = new Set(arr2.map(x => String(x).toLowerCase().trim()));

  let matches = 0;
  set1.forEach(item => {
    if (set2.has(item)) matches++;
  });

  const unionSize = new Set([...Array.from(set1), ...Array.from(set2)]).size;
  return unionSize > 0 ? Math.round((matches / unionSize) * 100) : 0;
}

export function evaluateJsonAccuracy(
  expectedJson: Record<string, any>,
  rawResponse: string
): JsonAccuracyReport {
  let parsedActual: any = null;
  let parseError: string | undefined;

  // Extract JSON block from response text (handling ```json code blocks)
  try {
    let cleanText = rawResponse.trim();
    if (cleanText.includes('```')) {
      const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        cleanText = match[1].trim();
      }
    }
    
    // Find first { or [ and last } or ]
    const firstBrace = cleanText.search(/[\{\[]/);
    const lastBrace = cleanText.search(/[\}\]][^}]*$/);
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    parsedActual = JSON.parse(cleanText);
  } catch (err: any) {
    parseError = err?.message || 'Invalid JSON output generated';
  }

  if (parseError || !parsedActual) {
    return {
      overallAccuracy: 0,
      keyMatchPercentage: 0,
      valueMatchPercentage: 0,
      schemaValidationScore: 0,
      totalExpectedKeys: Object.keys(flattenJson(expectedJson)).length,
      matchedKeysCount: 0,
      missingKeysCount: Object.keys(flattenJson(expectedJson)).length,
      mismatchedKeysCount: 0,
      diffDetails: [],
      parseError,
    };
  }

  const flattenedExpected = flattenJson(expectedJson);
  const flattenedActual = flattenJson(parsedActual);

  const expectedKeyPaths = Object.keys(flattenedExpected);
  const actualKeyPaths = Object.keys(flattenedActual);

  const diffDetails: JsonDiffDetail[] = [];
  let matchedKeysCount = 0;
  let missingKeysCount = 0;
  let mismatchedKeysCount = 0;
  let totalValueScore = 0;

  expectedKeyPaths.forEach((path) => {
    const expVal = flattenedExpected[path];

    if (!(path in flattenedActual)) {
      missingKeysCount++;
      diffDetails.push({
        keyPath: path,
        expectedValue: expVal,
        actualValue: undefined,
        status: 'MISSING',
        similarityScore: 0,
        reason: 'Key missing in model output',
      });
    } else {
      matchedKeysCount++;
      const actVal = flattenedActual[path];

      let score = 0;
      if (Array.isArray(expVal) && Array.isArray(actVal)) {
        score = compareArraySimilarity(expVal, actVal);
      } else {
        score = computeStringSimilarity(String(expVal), String(actVal));
      }

      totalValueScore += score;

      if (score >= 90) {
        diffDetails.push({
          keyPath: path,
          expectedValue: expVal,
          actualValue: actVal,
          status: 'MATCH',
          similarityScore: score,
        });
      } else {
        mismatchedKeysCount++;
        diffDetails.push({
          keyPath: path,
          expectedValue: expVal,
          actualValue: actVal,
          status: 'MISMATCH',
          similarityScore: score,
          reason: `Value mismatch (similarity: ${score}%)`,
        });
      }
    }
  });

  // Check extra keys created by model
  actualKeyPaths.forEach((path) => {
    if (!(path in flattenedExpected)) {
      diffDetails.push({
        keyPath: path,
        expectedValue: undefined,
        actualValue: flattenedActual[path],
        status: 'EXTRA',
        similarityScore: 0,
        reason: 'Extra key generated by model',
      });
    }
  });

  const totalExpected = expectedKeyPaths.length;
  const keyMatchPercentage = totalExpected > 0 ? Math.round((matchedKeysCount / totalExpected) * 100) : 0;
  const valueMatchPercentage = matchedKeysCount > 0 ? Math.round(totalValueScore / matchedKeysCount) : 0;
  const schemaValidationScore = 100;

  // Composite overall accuracy
  const overallAccuracy = Math.round(
    keyMatchPercentage * 0.4 + valueMatchPercentage * 0.5 + schemaValidationScore * 0.1
  );

  return {
    overallAccuracy: Math.min(100, Math.max(0, overallAccuracy)),
    keyMatchPercentage,
    valueMatchPercentage,
    schemaValidationScore,
    totalExpectedKeys: totalExpected,
    matchedKeysCount,
    missingKeysCount,
    mismatchedKeysCount,
    diffDetails,
    rawParsedJson: parsedActual,
  };
}
