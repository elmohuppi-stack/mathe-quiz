from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from sympy import symbols, sympify, solve, simplify, expand, factor, cancel
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
)
from sympy.core.sympify import SympifyError

app = FastAPI(title="Mathe Quiz Validator", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Expression(BaseModel):
    expression: str
    variables: list[str] = ["x"]


class Equation(BaseModel):
    left: str
    right: str
    variables: list[str] = ["x"]


class Step(BaseModel):
    current: str
    proposed: str
    variables: list[str] = ["x"]


class ExpressionValidation(BaseModel):
    is_valid: bool
    message: str
    simplified: Optional[str] = None
    error_code: Optional[str] = None


class EquationValidation(BaseModel):
    is_valid: bool
    are_equivalent: bool
    message: str
    solution_left: list[str] = []
    solution_right: list[str] = []
    error_code: Optional[str] = None


class StepValidation(BaseModel):
    is_valid: bool
    are_equivalent: bool
    transformation_type: Optional[str] = None
    message: str
    error_code: Optional[str] = None


def parse_math_expression(expr_str: str, variables: list[str] = ["x"]):
    """Parse and validate a mathematical expression"""
    try:
        transformations = standard_transformations + (
            implicit_multiplication_application,
        )
        expr = parse_expr(
            expr_str,
            local_dict={var: symbols(var) for var in variables},
            transformations=transformations,
        )
        return expr, None
    except SympifyError as e:
        return None, f"parse_error: {str(e)}"
    except Exception as e:
        return None, f"syntax_error: {str(e)}"


def parse_equation(equation_str: str, variables: list[str] = ["x"]):
    """Parse and validate an equation with exactly one equals sign"""
    parts = equation_str.split("=")
    if len(parts) != 2:
        return None, None, "syntax_error: equation must contain exactly one '='"

    left_expr, left_err = parse_math_expression(parts[0].strip(), variables)
    right_expr, right_err = parse_math_expression(parts[1].strip(), variables)

    if left_err or right_err:
        return None, None, left_err or right_err

    return left_expr, right_expr, None


def get_primary_variable(variables: list[str] = ["x"]):
    vars_symbols = symbols(variables)
    if isinstance(vars_symbols, tuple):
        return vars_symbols[0]
    return vars_symbols


def are_expressions_equivalent(expr1: str, expr2: str, variables: list[str] = ["x"]):
    """Check if two expressions are mathematically equivalent"""
    try:
        parsed1, err1 = parse_math_expression(expr1, variables)
        parsed2, err2 = parse_math_expression(expr2, variables)

        if err1 or err2:
            return False, err1 or err2

        # Simplify both expressions and compare
        simplified1 = simplify(parsed1)
        simplified2 = simplify(parsed2)

        # Check if they're equal
        are_equal = simplified1 == simplified2

        # If not equal, try expanding/factoring
        if not are_equal:
            expanded1 = expand(parsed1)
            expanded2 = expand(parsed2)
            are_equal = expanded1 == expanded2

        return are_equal, None
    except Exception as e:
        return False, f"comparison_error: {str(e)}"


def are_equations_equivalent(eq1: str, eq2: str, variables: list[str] = ["x"]):
    """Check if two equations are mathematically equivalent"""
    try:
        left1, right1, err1 = parse_equation(eq1, variables)
        left2, right2, err2 = parse_equation(eq2, variables)

        if err1 or err2:
            return False, err1 or err2

        var = get_primary_variable(variables)
        sol1 = [simplify(sol) for sol in solve(left1 - right1, var)]
        sol2 = [simplify(sol) for sol in solve(left2 - right2, var)]

        if sorted(str(sol) for sol in sol1) == sorted(str(sol) for sol in sol2):
            return True, None

        normalized1 = simplify(left1 - right1)
        normalized2 = simplify(left2 - right2)

        if simplify(normalized1 - normalized2) == 0:
            return True, None

        try:
            ratio = simplify(normalized1 / normalized2)
            if ratio != 0 and ratio.free_symbols.isdisjoint({var}):
                return True, None
        except Exception:
            pass

        return False, None
    except Exception as e:
        return False, f"comparison_error: {str(e)}"


def count_variable_occurrences(expr_str: str, variable: str = "x"):
    return expr_str.replace(" ", "").count(variable)


def identify_expression_rewrite(
    current_str: str,
    proposed_str: str,
    current_expr,
    proposed_expr,
    variable: str = "x",
):
    """Classify a one-sided rewrite when the opposite side stays unchanged."""
    current_clean = current_str.replace(" ", "")
    proposed_clean = proposed_str.replace(" ", "")

    if current_clean == proposed_clean:
        return None

    if simplify(current_expr - proposed_expr) != 0:
        return None

    if "(" in current_clean and "(" not in proposed_clean:
        return "distributive_law"

    if count_variable_occurrences(current_clean, variable) > count_variable_occurrences(
        proposed_clean, variable
    ):
        return "combine_like_terms"

    if proposed_clean.count("+") + proposed_clean.count("-") < current_clean.count(
        "+"
    ) + current_clean.count("-"):
        return "simplification"

    return "equivalent_form"


def identify_transformation(current: str, proposed: str, variables: list[str] = ["x"]):
    """Identify what mathematical transformation was applied"""
    try:
        if "=" in current and "=" in proposed:
            current_left_str, current_right_str = [
                part.strip() for part in current.split("=")
            ]
            proposed_left_str, proposed_right_str = [
                part.strip() for part in proposed.split("=")
            ]
            curr_left, curr_right, current_err = parse_equation(current, variables)
            prop_left, prop_right, proposed_err = parse_equation(proposed, variables)

            if current_err or proposed_err:
                return "unknown", current_err or proposed_err

            diff_left = simplify(curr_left - prop_left)
            diff_right = simplify(curr_right - prop_right)
            if diff_left == diff_right and diff_left != 0:
                if diff_left.is_number and diff_left.is_negative:
                    return "add_both_sides", None
                return "subtract_both_sides", None

            if curr_left == 0 or curr_right == 0:
                pass
            else:
                try:
                    ratio_left = simplify(prop_left / curr_left)
                    ratio_right = simplify(prop_right / curr_right)
                    if ratio_left == ratio_right and ratio_left != 1:
                        if ratio_left.is_number:
                            ratio_magnitude = simplify(abs(ratio_left))
                            if ratio_magnitude.is_number and ratio_magnitude < 1:
                                return "divide_both_sides", None
                            return "multiply_both_sides", None
                except Exception:
                    pass

            variable = variables[0] if variables else "x"
            if simplify(curr_right - prop_right) == 0:
                left_rewrite = identify_expression_rewrite(
                    current_left_str,
                    proposed_left_str,
                    curr_left,
                    prop_left,
                    variable,
                )
                if left_rewrite:
                    return left_rewrite, None

            if simplify(curr_left - prop_left) == 0:
                right_rewrite = identify_expression_rewrite(
                    current_right_str,
                    proposed_right_str,
                    curr_right,
                    prop_right,
                    variable,
                )
                if right_rewrite:
                    return right_rewrite, None

            return "other_transformation", None

        parsed_current, current_err = parse_math_expression(current, variables)
        parsed_proposed, proposed_err = parse_math_expression(proposed, variables)

        if (
            current_err
            or proposed_err
            or parsed_current is None
            or parsed_proposed is None
        ):
            return "unknown", current_err or proposed_err

        current_expanded = expand(parsed_current)
        proposed_expanded = expand(parsed_proposed)
        current_factored = factor(parsed_current)
        proposed_factored = factor(parsed_proposed)
        current_simplified = simplify(parsed_current)
        proposed_simplified = simplify(parsed_proposed)

        # Check what transformation happened
        if proposed_expanded == current_expanded:
            return "simplification", None
        elif proposed_factored == current_factored:
            return "factoring", None
        elif proposed_simplified == current_simplified:
            return "equivalent_form", None
        elif cancel(parsed_current / parsed_proposed) == 1:
            return "cancellation", None
        else:
            return "other_transformation", None

    except Exception as e:
        return "unknown", str(e)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "validator"}


@app.post("/validate/expression", response_model=ExpressionValidation)
async def validate_expression(data: Expression):
    """Validate a mathematical expression"""
    try:
        expr, error = parse_math_expression(data.expression, data.variables)

        if error:
            return ExpressionValidation(
                is_valid=False,
                message=f"Invalid expression: {error}",
                error_code=error.split(":")[0],
            )

        # Successfully parsed
        simplified = str(simplify(expr))
        return ExpressionValidation(
            is_valid=True,
            message="Expression is valid",
            simplified=simplified,
        )

    except Exception as e:
        return ExpressionValidation(
            is_valid=False,
            message=f"Validation error: {str(e)}",
            error_code="internal_error",
        )


@app.post("/validate/equation", response_model=EquationValidation)
async def validate_equation(data: Equation):
    """Validate if two sides of an equation are equivalent"""
    try:
        # Parse both sides
        left_expr, left_err = parse_math_expression(data.left, data.variables)
        right_expr, right_err = parse_math_expression(data.right, data.variables)

        if left_err or right_err:
            return EquationValidation(
                is_valid=False,
                are_equivalent=False,
                message=f"Parse error: {left_err or right_err}",
                error_code=(left_err or right_err).split(":")[0],
            )

        # Check equivalence
        are_equiv, comp_err = are_expressions_equivalent(
            data.left, data.right, data.variables
        )

        if comp_err:
            return EquationValidation(
                is_valid=False,
                are_equivalent=False,
                message=f"Comparison error: {comp_err}",
                error_code=comp_err.split(":")[0],
            )

        # Try to solve equations if they're equivalent
        solution_left = []
        solution_right = []

        if are_equiv:
            try:
                # Create variable symbols
                vars_symbols = symbols(data.variables)
                if isinstance(vars_symbols, tuple):
                    var = vars_symbols[0]
                else:
                    var = vars_symbols

                # Solve both sides
                sol_left = solve(left_expr, var)
                sol_right = solve(right_expr, var)

                solution_left = [str(s) for s in sol_left] if sol_left else []
                solution_right = [str(s) for s in sol_right] if sol_right else []
            except:
                pass

        return EquationValidation(
            is_valid=True,
            are_equivalent=are_equiv,
            message=(
                "Both sides are equivalent" if are_equiv else "Sides are not equivalent"
            ),
            solution_left=solution_left,
            solution_right=solution_right,
        )

    except Exception as e:
        return EquationValidation(
            is_valid=False,
            are_equivalent=False,
            message=f"Validation error: {str(e)}",
            error_code="internal_error",
        )


@app.post("/validate/step", response_model=StepValidation)
async def validate_step(data: Step):
    """Validate if a step transformation is correct"""
    try:
        is_equation_step = "=" in data.current or "=" in data.proposed

        if is_equation_step:
            _, _, current_err = parse_equation(data.current, data.variables)
            _, _, proposed_err = parse_equation(data.proposed, data.variables)
            are_equiv, comp_err = are_equations_equivalent(
                data.current, data.proposed, data.variables
            )
        else:
            _, current_err = parse_math_expression(data.current, data.variables)
            _, proposed_err = parse_math_expression(data.proposed, data.variables)
            are_equiv, comp_err = are_expressions_equivalent(
                data.current, data.proposed, data.variables
            )

        if current_err or proposed_err:
            return StepValidation(
                is_valid=False,
                are_equivalent=False,
                message=f"Parse error: {current_err or proposed_err}",
                error_code=(current_err or proposed_err).split(":")[0],
            )

        if comp_err:
            return StepValidation(
                is_valid=False,
                are_equivalent=False,
                message=f"Not equivalent: {comp_err}",
                error_code=comp_err.split(":")[0],
            )

        # Identify the transformation type
        transformation, trans_err = identify_transformation(
            data.current, data.proposed, data.variables
        )

        is_single_step = are_equiv and transformation != "other_transformation"
        message = "Step is not algebraically equivalent"
        error_code = None

        if are_equiv and transformation == "other_transformation":
            message = (
                "Step is algebraically equivalent but combines multiple transformations"
            )
            error_code = "too_big_step"
        elif is_single_step:
            message = "Step is valid and algebraically correct"

        return StepValidation(
            is_valid=is_single_step,
            are_equivalent=are_equiv,
            transformation_type=transformation,
            message=message,
            error_code=error_code or trans_err,
        )

    except Exception as e:
        return StepValidation(
            is_valid=False,
            are_equivalent=False,
            message=f"Validation error: {str(e)}",
            error_code="internal_error",
        )


@app.post("/solve/equation")
async def solve_equation(data: Equation):
    """Solve an equation and return solutions"""
    try:
        # Create a combined equation (left - right = 0)
        left_expr, left_err = parse_math_expression(data.left, data.variables)
        right_expr, right_err = parse_math_expression(data.right, data.variables)

        if left_err or right_err:
            return {
                "success": False,
                "message": f"Parse error: {left_err or right_err}",
                "solutions": [],
            }

        # Create symbols for variables
        vars_symbols = symbols(data.variables)
        if isinstance(vars_symbols, tuple):
            var = vars_symbols[0]
        else:
            var = vars_symbols

        # Solve the equation left = right
        equation = left_expr - right_expr
        solutions = solve(equation, var)

        return {
            "success": True,
            "message": "Equation solved successfully",
            "solutions": [str(s) for s in solutions],
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Solving error: {str(e)}",
            "solutions": [],
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=3001)

    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
