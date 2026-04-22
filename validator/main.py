from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from sympy import symbols, sympify, solve, simplify, expand, factor, cancel
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
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
    simplified: str = None
    error_code: str = None


class EquationValidation(BaseModel):
    is_valid: bool
    are_equivalent: bool
    message: str
    solution_left: list[str] = []
    solution_right: list[str] = []
    error_code: str = None


class StepValidation(BaseModel):
    is_valid: bool
    are_equivalent: bool
    transformation_type: str = None
    message: str
    error_code: str = None


def parse_math_expression(expr_str: str, variables: list[str] = ["x"]):
    """Parse and validate a mathematical expression"""
    try:
        transformations = standard_transformations + (implicit_multiplication_application,)
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


def identify_transformation(current: str, proposed: str, variables: list[str] = ["x"]):
    """Identify what mathematical transformation was applied"""
    try:
        parsed_current, _ = parse_math_expression(current, variables)
        parsed_proposed, _ = parse_math_expression(proposed, variables)

        if parsed_current is None or parsed_proposed is None:
            return "unknown", None

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
        are_equiv, comp_err = are_expressions_equivalent(data.left, data.right, data.variables)

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
            message="Both sides are equivalent" if are_equiv else "Sides are not equivalent",
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
        # Parse both expressions
        current_expr, current_err = parse_math_expression(data.current, data.variables)
        proposed_expr, proposed_err = parse_math_expression(data.proposed, data.variables)

        if current_err or proposed_err:
            return StepValidation(
                is_valid=False,
                are_equivalent=False,
                message=f"Parse error: {current_err or proposed_err}",
                error_code=(current_err or proposed_err).split(":")[0],
            )

        # Check if expressions are equivalent
        are_equiv, comp_err = are_expressions_equivalent(data.current, data.proposed, data.variables)

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

        return StepValidation(
            is_valid=are_equiv,
            are_equivalent=are_equiv,
            transformation_type=transformation,
            message="Step is valid and algebraically correct"
            if are_equiv
            else "Step is not algebraically equivalent",
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
