import test from "node:test";
import assert from "node:assert/strict";

/**
 * Type annotation error tests
 *
 * These tests ensure that type annotations are properly declared
 * to prevent implicit 'any' type errors and improve type safety.
 *
 * Related issue: TS7006 - Parameter implicitly has an 'any' type
 * when using array methods like map() without proper type hints.
 */

/**
 * Test: Map function with proper type annotation
 *
 * This test ensures that when mapping over arrays with complex types,
 * the parameter types are explicitly declared to satisfy TypeScript's
 * strict mode (noImplicitAny: true).
 */
test("array map callback has proper type annotation", () => {
  interface TestData {
    id: string;
    value: number;
  }

  const testItems: TestData[] = [
    { id: "1", value: 100 },
    { id: "2", value: 200 },
  ];

  // ✓ CORRECT: Type annotation explicitly provided
  const transformed = testItems.map((item: TestData) => ({
    id: item.id,
    doubledValue: item.value * 2,
  }));

  assert.strictEqual(transformed.length, 2);
  assert.strictEqual(transformed[0].doubledValue, 200);
  assert.strictEqual(transformed[1].doubledValue, 400);
});

/**
 * Test: Complex object array mapping with inference
 *
 * Validates that type inference works correctly when the source array
 * has an explicit type annotation, even without repeating the type
 * in the callback parameter.
 */
test("inferred type in map callback from array type annotation", () => {
  interface Answer {
    id: string;
    userId: string;
    taskData: unknown;
    userAnswer: string;
    isCorrect: boolean;
  }

  const answers: Answer[] = [
    {
      id: "a1",
      userId: "u1",
      taskData: { question: "test" },
      userAnswer: "correct",
      isCorrect: true,
    },
  ];

  // With the Answer array type annotation above, TypeScript should infer the type
  // This should work without explicit type annotation in callback
  const answerIds = answers.map((answer) => answer.id);

  assert.strictEqual(answerIds[0], "a1");
});

/**
 * Test: Type assertion for complex array transformations
 *
 * When mapping over a tuple-unpacked promise result, explicit type
 * annotation ensures all properties are type-safe.
 */
test("map with explicit type assertion for tuple result", () => {
  interface Item {
    id: string;
    text: string;
    timestamp: Date;
  }

  // Simulating Promise.all result unpacking
  const items: Item[] = [
    { id: "1", text: "first", timestamp: new Date("2024-01-01") },
    { id: "2", text: "second", timestamp: new Date("2024-01-02") },
  ];

  // ✓ CORRECT: Using type annotation when mapping
  const result = items.map((item: (typeof items)[number]) => ({
    id: item.id,
    iso: item.timestamp.toISOString(),
  }));

  assert.strictEqual(result.length, 2);
  assert.ok(result[0].iso.includes("2024-01-01"));
});

/**
 * Test: Function parameter type safety
 *
 * Ensures that callback functions used in higher-order functions
 * have proper parameter types to avoid implicit 'any' errors.
 */
test("higher-order function callback types are safe", () => {
  interface Record {
    id: string;
    value: number;
  }

  function processRecords(
    records: Record[],
    callback: (record: Record) => string,
  ): string[] {
    return records.map((r) => callback(r));
  }

  const records: Record[] = [{ id: "1", value: 42 }];

  // The callback parameter is properly typed because it's declared
  // in the function signature
  const results = processRecords(records, (record: Record) => record.id);

  assert.strictEqual(results[0], "1");
});

/**
 * Test: Destructured parameters in map
 *
 * Validates that destructured parameters also get proper type annotations
 * to prevent implicit 'any' types.
 */
test("destructured map callback parameters have types", () => {
  interface Item {
    id: string;
    name: string;
    active: boolean;
  }

  const items: Item[] = [
    { id: "1", name: "Item A", active: true },
    { id: "2", name: "Item B", active: false },
  ];

  // ✓ CORRECT: Destructured parameters with type annotation
  const names = items.map(({ id, name }: Item) => `${id}-${name}`);

  assert.strictEqual(names[0], "1-Item A");
  assert.strictEqual(names[1], "2-Item B");
});
