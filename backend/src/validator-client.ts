import axios from "axios";

/**
 * Validator Service Client
 * Communicates with the Python FastAPI validator service for algebra step validation
 * Service runs at http://validator:3001 internally
 */

const VALIDATOR_URL = process.env.VALIDATOR_URL || "http://validator:3001";

export interface ValidatorStepRequest {
  current: string; // Current equation (e.g., "2x + 3 = 11")
  proposed: string; // Proposed next step (e.g., "2x = 8")
  variables?: string[]; // Variables in the equation (default: ["x"])
}

export interface ValidatorStepResponse {
  is_valid: boolean;
  are_equivalent: boolean;
  transformation_type?: string;
  message: string;
  error_code?: string;
}

export interface ErrorClassification {
  type: string;
  description: string;
  severity: "critical" | "warning";
}

/**
 * Validate an algebra step
 * Returns whether the step is mathematically correct and equivalent
 */
export async function validateAlgebraStep(
  request: ValidatorStepRequest,
): Promise<ValidatorStepResponse> {
  try {
    const response = await axios.post<ValidatorStepResponse>(
      `${VALIDATOR_URL}/validate/step`,
      {
        current: request.current,
        proposed: request.proposed,
        variables: request.variables || ["x"],
      },
      { timeout: 5000 },
    );

    return response.data;
  } catch (error) {
    console.error("Validator step validation failed:", error);

    // Return error response if validator is unreachable
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return error.response.data as ValidatorStepResponse;
      }
      return {
        is_valid: false,
        are_equivalent: false,
        message: `Validator error: ${error.message}`,
        error_code: "validator_unavailable",
      };
    }

    return {
      is_valid: false,
      are_equivalent: false,
      message: "Unknown validator error",
      error_code: "internal_error",
    };
  }
}

/**
 * Classify error type based on validator response
 * Maps SymPy errors to user-friendly error classifications
 */
export function classifyError(
  current: string,
  proposed: string,
  validatorResponse: ValidatorStepResponse,
): ErrorClassification | null {
  // If step is valid, no error
  if (validatorResponse.is_valid) {
    return null;
  }

  // Parse error or syntax error
  if (
    validatorResponse.error_code?.includes("parse") ||
    validatorResponse.error_code?.includes("syntax")
  ) {
    return {
      type: "SYNTAX_ERROR",
      description: "errors.training.syntax_error",
      severity: "critical",
    };
  }

  // Not equivalent - check for common errors
  if (!validatorResponse.are_equivalent) {
    // Try to detect common error patterns
    const currentLhs = current.split("=")[0]?.trim();
    const currentRhs = current.split("=")[1]?.trim();
    const proposedLhs = proposed.split("=")[0]?.trim();
    const proposedRhs = proposed.split("=")[1]?.trim();

    // Sign error detection
    if (currentLhs && currentRhs && proposedLhs && proposedRhs) {
      const currentRhsNum = parseFloat(currentRhs);
      const proposedRhsNum = parseFloat(proposedRhs);

      // Check if only sign changed on one side
      if (
        Math.abs(currentRhsNum) === Math.abs(proposedRhsNum) &&
        currentRhsNum !== proposedRhsNum &&
        !Number.isNaN(currentRhsNum) &&
        !Number.isNaN(proposedRhsNum)
      ) {
        return {
          type: "SIGN_ERROR",
          description: "errors.training.sign_error",
          severity: "critical",
        };
      }

      // Check if operation was only applied to one side
      if (
        currentLhs.trim() !== proposedLhs.trim() &&
        currentRhs.trim() === proposedRhs.trim()
      ) {
        return {
          type: "RULE_VIOLATION",
          description: "errors.training.rule_violation",
          severity: "critical",
        };
      }

      if (
        currentLhs.trim() === proposedLhs.trim() &&
        currentRhs.trim() !== proposedRhs.trim()
      ) {
        return {
          type: "RULE_VIOLATION",
          description: "errors.training.rule_violation",
          severity: "critical",
        };
      }
    }

    // Generic non-equivalent error
    return {
      type: "INCORRECT_STEP",
      description: "errors.training.incorrect_step",
      severity: "critical",
    };
  }

  // Step is too large (correct but skips multiple steps)
  if (validatorResponse.transformation_type === "other_transformation") {
    // If it's equivalent but transformation type is "other", likely too many steps combined
    return {
      type: "TOO_BIG_STEP",
      description: "errors.training.too_big_step",
      severity: "warning",
    };
  }

  return null;
}

/**
 * Validate if two equations are equivalent
 * Used for checking if final solution matches expected solution
 */
export async function validateEquivalentEquations(
  equation1: string,
  equation2: string,
  variables: string[] = ["x"],
): Promise<boolean> {
  try {
    const response = await axios.post<{
      is_valid: boolean;
      are_equivalent: boolean;
    }>(
      `${VALIDATOR_URL}/validate/equation`,
      {
        left: equation1,
        right: equation2,
        variables,
      },
      { timeout: 5000 },
    );

    return response.data.are_equivalent;
  } catch (error) {
    console.error("Equation validation failed:", error);
    return false;
  }
}

/**
 * Health check for validator service
 */
export async function checkValidatorHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${VALIDATOR_URL}/health`, {
      timeout: 3000,
    });
    return response.status === 200;
  } catch (error) {
    console.error("Validator health check failed:", error);
    return false;
  }
}
