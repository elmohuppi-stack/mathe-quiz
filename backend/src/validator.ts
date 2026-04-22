import axios from "axios";

const validatorUrl = process.env.VALIDATOR_URL || "http://validator:3001";

const validatorClient = axios.create({
  baseURL: validatorUrl,
  timeout: 5000,
});

export interface ExpressionValidationResult {
  is_valid: boolean;
  message: string;
  simplified?: string;
  error_code?: string;
}

export interface EquationValidationResult {
  is_valid: boolean;
  are_equivalent: boolean;
  message: string;
  solution_left?: string[];
  solution_right?: string[];
  error_code?: string;
}

export interface StepValidationResult {
  is_valid: boolean;
  are_equivalent: boolean;
  transformation_type?: string;
  message: string;
  error_code?: string;
}

/**
 * Validate a mathematical expression using SymPy
 */
export async function validateExpression(
  expression: string,
  variables: string[] = ["x"],
): Promise<ExpressionValidationResult> {
  try {
    const response = await validatorClient.post<ExpressionValidationResult>(
      "/validate/expression",
      {
        expression,
        variables,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Expression validation error:", error);
    return {
      is_valid: false,
      message: "Validator service error",
      error_code: "service_error",
    };
  }
}

/**
 * Validate if two equation sides are equivalent
 */
export async function validateEquation(
  left: string,
  right: string,
  variables: string[] = ["x"],
): Promise<EquationValidationResult> {
  try {
    const response = await validatorClient.post<EquationValidationResult>(
      "/validate/equation",
      {
        left,
        right,
        variables,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Equation validation error:", error);
    return {
      is_valid: false,
      are_equivalent: false,
      message: "Validator service error",
      error_code: "service_error",
    };
  }
}

/**
 * Validate an algebraic transformation step
 */
export async function validateStep(
  current: string,
  proposed: string,
  variables: string[] = ["x"],
): Promise<StepValidationResult> {
  try {
    const response = await validatorClient.post<StepValidationResult>(
      "/validate/step",
      {
        current,
        proposed,
        variables,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Step validation error:", error);
    return {
      is_valid: false,
      are_equivalent: false,
      message: "Validator service error",
      error_code: "service_error",
    };
  }
}

/**
 * Solve an equation
 */
export async function solveEquation(
  left: string,
  right: string,
  variables: string[] = ["x"],
): Promise<{ success: boolean; solutions: string[]; message: string }> {
  try {
    const response = await validatorClient.post("/solve/equation", {
      left,
      right,
      variables,
    });
    return response.data;
  } catch (error) {
    console.error("Equation solving error:", error);
    return {
      success: false,
      solutions: [],
      message: "Validator service error",
    };
  }
}
