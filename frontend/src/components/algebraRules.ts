export function normalizeAlgebraSide(side: string): string {
  return side
    .replace(/\s+/g, "")
    .replace(/\+\+/g, "+")
    .replace(/\+-/g, "-")
    .replace(/-\+/g, "-")
    .replace(/--/g, "+");
}

function countVariableOccurrences(side: string): number {
  return (side.match(/x/g) || []).length;
}

function parseLinearSide(side: string): {
  coefficient: number;
  constant: number;
} | null {
  const normalized = normalizeAlgebraSide(side);
  const match = normalized.match(/^([+-]?\d*)x([+-]\d+)?$/);

  if (!match) {
    return null;
  }

  const coefficientToken = match[1];
  const coefficient =
    coefficientToken === "" || coefficientToken === "+"
      ? 1
      : coefficientToken === "-"
        ? -1
        : Number(coefficientToken);

  return {
    coefficient,
    constant: match[2] ? Number(match[2]) : 0,
  };
}

function isFractionVariableSide(side: string): boolean {
  const normalized = normalizeAlgebraSide(side);
  return /^[+-]?(?:\d+)?x\/\d+$/.test(normalized);
}

function parseFractionVariableSide(side: string): {
  coefficient: number;
  denominator: number;
} | null {
  const normalized = normalizeAlgebraSide(side);
  const match = normalized.match(/^([+-]?\d*)x\/(\d+)$/);

  if (!match) {
    return null;
  }

  const coefficientToken = match[1];
  const coefficient =
    coefficientToken === "" || coefficientToken === "+"
      ? 1
      : coefficientToken === "-"
        ? -1
        : Number(coefficientToken);

  return {
    coefficient,
    denominator: Number(match[2]),
  };
}

export function deriveCurrentRule(
  equation: string,
  fallbackRule?: string,
): string | undefined {
  const parts = equation.split("=");
  if (parts.length !== 2) {
    return fallbackRule;
  }

  const left = parts[0].trim();
  const right = parts[1].trim();

  if (equation.includes("(")) {
    return "distributive_law";
  }

  if (
    countVariableOccurrences(left) > 1 ||
    countVariableOccurrences(right) > 1
  ) {
    return "combine_like_terms";
  }

  const leftLinear = parseLinearSide(left);
  const rightLinear = parseLinearSide(right);
  const leftHasVariable = left.includes("x");
  const rightHasVariable = right.includes("x");

  if (leftLinear && !rightHasVariable) {
    if (leftLinear.constant !== 0) {
      return leftLinear.constant > 0 ? "subtract_both_sides" : "add_both_sides";
    }
    if (Math.abs(leftLinear.coefficient) !== 1) {
      return "divide_both_sides";
    }
  }

  if (leftHasVariable && !rightHasVariable && isFractionVariableSide(left)) {
    return "multiply_both_sides";
  }

  if (rightLinear && !leftHasVariable) {
    if (rightLinear.constant !== 0) {
      return rightLinear.constant > 0
        ? "subtract_both_sides"
        : "add_both_sides";
    }
    if (Math.abs(rightLinear.coefficient) !== 1) {
      return "divide_both_sides";
    }
  }

  if (rightHasVariable && !leftHasVariable && isFractionVariableSide(right)) {
    return "multiply_both_sides";
  }

  if (leftHasVariable && rightHasVariable) {
    return "subtract_both_sides";
  }

  return fallbackRule;
}

function formatLinearExpression(coefficient: number, constant: number): string {
  const variablePart =
    coefficient === 0
      ? ""
      : coefficient === 1
        ? "x"
        : coefficient === -1
          ? "-x"
          : `${coefficient}x`;

  if (constant === 0) {
    return variablePart || "0";
  }

  if (!variablePart) {
    return `${constant}`;
  }

  return `${variablePart}${constant > 0 ? `+${constant}` : constant}`;
}

function formatScalarValue(value: number): string {
  if (Number.isInteger(value)) {
    return `${value}`;
  }

  return `${value}`;
}

export function deriveExpectedEquationForRule(
  equation: string,
  rule?: string,
): string | null {
  const parts = equation.split("=");
  if (parts.length !== 2 || !rule) {
    return null;
  }

  const left = parts[0].trim();
  const right = parts[1].trim();
  const leftLinear = parseLinearSide(left);
  const rightLinear = parseLinearSide(right);
  const leftFraction = parseFractionVariableSide(left);
  const rightFraction = parseFractionVariableSide(right);
  const leftNumber = Number(normalizeAlgebraSide(left));
  const rightNumber = Number(normalizeAlgebraSide(right));
  const leftIsNumber = !Number.isNaN(leftNumber);
  const rightIsNumber = !Number.isNaN(rightNumber);

  if (rule === "subtract_both_sides") {
    if (leftLinear && rightIsNumber && leftLinear.constant !== 0) {
      return `${formatLinearExpression(leftLinear.coefficient, 0)}=${rightNumber - leftLinear.constant}`;
    }

    if (rightLinear && leftIsNumber && rightLinear.constant !== 0) {
      return `${leftNumber - rightLinear.constant}=${formatLinearExpression(rightLinear.coefficient, 0)}`;
    }
  }

  if (rule === "add_both_sides") {
    if (leftLinear && rightIsNumber && leftLinear.constant !== 0) {
      return `${formatLinearExpression(leftLinear.coefficient, 0)}=${rightNumber - leftLinear.constant}`;
    }

    if (rightLinear && leftIsNumber && rightLinear.constant !== 0) {
      return `${leftNumber - rightLinear.constant}=${formatLinearExpression(rightLinear.coefficient, 0)}`;
    }
  }

  if (rule === "divide_both_sides") {
    if (leftLinear && rightIsNumber && leftLinear.constant === 0) {
      return `x=${formatScalarValue(rightNumber / leftLinear.coefficient)}`;
    }

    if (rightLinear && leftIsNumber && rightLinear.constant === 0) {
      return `${formatScalarValue(leftNumber / rightLinear.coefficient)}=x`;
    }
  }

  if (rule === "multiply_both_sides") {
    if (leftFraction && rightIsNumber) {
      return `${formatLinearExpression(leftFraction.coefficient, 0)}=${formatScalarValue(rightNumber * leftFraction.denominator)}`;
    }

    if (rightFraction && leftIsNumber) {
      return `${formatScalarValue(leftNumber * rightFraction.denominator)}=${formatLinearExpression(rightFraction.coefficient, 0)}`;
    }
  }

  return null;
}

export function isLocallyAcceptedAlgebraStep(
  proposedStep: string,
  currentEquation: string,
  expectedFirstStep?: string,
  fallbackRule?: string,
): boolean {
  const directExpected = expectedFirstStep
    ? normalizeAlgebraSide(expectedFirstStep)
    : "";
  const derivedExpected = normalizeAlgebraSide(
    deriveExpectedEquationForRule(
      currentEquation,
      deriveCurrentRule(currentEquation, fallbackRule),
    ) || "",
  );
  const normalizedProposedStep = normalizeAlgebraSide(proposedStep);

  return (
    normalizedProposedStep === directExpected ||
    normalizedProposedStep === derivedExpected
  );
}
