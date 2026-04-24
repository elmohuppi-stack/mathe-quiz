import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveAlgebraStepValidation,
  type ValidatorStepResponse,
} from "./validator-client.js";

test("exact expected algebra step is accepted even if validator rejects it", () => {
  const validatorResponse: ValidatorStepResponse = {
    is_valid: false,
    are_equivalent: false,
    transformation_type: "unknown",
    message: "Step is not algebraically equivalent",
    error_code: "comparison_error",
  };

  const result = resolveAlgebraStepValidation(
    "3x + 15 = 2x + 22",
    "3x + 15 = 2x + 22",
    validatorResponse,
  );

  assert.equal(result.isExactMatch, true);
  assert.equal(result.stepValidation.is_valid, true);
  assert.equal(result.stepValidation.are_equivalent, true);
  assert.equal(result.stepValidation.error_code, undefined);
  assert.equal(
    result.stepValidation.message,
    "Step matches expected next step",
  );
});

test("non-matching algebra step still uses validator result", () => {
  const validatorResponse: ValidatorStepResponse = {
    is_valid: false,
    are_equivalent: false,
    transformation_type: "other_transformation",
    message: "Step is not algebraically equivalent",
    error_code: "comparison_error",
  };

  const result = resolveAlgebraStepValidation(
    "3x + 14 = 2x + 22",
    "3x + 15 = 2x + 22",
    validatorResponse,
  );

  assert.equal(result.isExactMatch, false);
  assert.equal(result.stepValidation, validatorResponse);
});
