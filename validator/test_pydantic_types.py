"""
Pydantic v2 Type Annotation Tests

These tests ensure that Pydantic models use proper type annotations
to prevent validation errors that arise from incorrect syntax.

Related issue: Pydantic v2 requires Optional[T] instead of T = None
for optional fields. Using T = None causes:
"Input should be a valid string [type=string_type, input_value=None, input_type=NoneType]"
"""

import unittest
from typing import Optional
from pydantic import BaseModel, ValidationError


class TestPydanticV2TypeAnnotations(unittest.TestCase):
    """Test suite for Pydantic v2 type annotation requirements."""

    def test_optional_string_field_with_none_value(self):
        """
        Test that Optional[str] fields accept None values correctly.

        In Pydantic v2, declaring a field as str = None is invalid.
        The correct syntax is Optional[str] = None or str | None = None.
        """

        class ExpressionValidation(BaseModel):
            result: str
            error_code: Optional[str] = None  # ✓ CORRECT

        # Should accept None without validation error
        validation = ExpressionValidation(result="2x + 3", error_code=None)
        self.assertIsNone(validation.error_code)

        # Should accept string value
        validation = ExpressionValidation(result="x", error_code="invalid_syntax")
        self.assertEqual(validation.error_code, "invalid_syntax")

    def test_incorrect_optional_syntax_fails(self):
        """
        Test that incorrect Pydantic v2 syntax (str = None) raises ValidationError.

        This test documents what happens when developers forget to use Optional[]
        for fields that should accept None values.
        """

        # This demonstrates the WRONG way (for reference)
        class IncorrectModel(BaseModel):
            # In Pydantic v2, this is interpreted as a required string field
            # with a default value of None, which is invalid
            field: str = None  # type: ignore

        with self.assertRaises(ValidationError) as context:
            IncorrectModel(field=None)

        # Verify it's the expected error about type
        errors = context.exception.errors()
        self.assertGreater(len(errors), 0)
        self.assertEqual(errors[0]["type"], "string_type")

    def test_multiple_optional_fields(self):
        """
        Test multiple optional fields in a model class.

        Ensures consistency when a model has several optional fields
        that should all accept None values.
        """

        class StepValidation(BaseModel):
            is_valid: bool
            are_equivalent: bool
            transformation_type: Optional[str] = None  # ✓ CORRECT
            error_code: Optional[str] = None  # ✓ CORRECT
            message: Optional[str] = None  # ✓ CORRECT

        # All optional fields should accept None
        validation = StepValidation(
            is_valid=False,
            are_equivalent=False,
            transformation_type=None,
            error_code=None,
            message=None,
        )

        self.assertIsNone(validation.transformation_type)
        self.assertIsNone(validation.error_code)
        self.assertIsNone(validation.message)

    def test_optional_fields_with_mixed_values(self):
        """
        Test that optional fields work correctly with both None and actual values.
        """

        class EquationValidation(BaseModel):
            is_valid: bool
            simplified: Optional[str] = None
            error_code: Optional[str] = None

        # Test 1: All None
        validation1 = EquationValidation(
            is_valid=True, simplified=None, error_code=None
        )
        self.assertIsNone(validation1.simplified)
        self.assertIsNone(validation1.error_code)

        # Test 2: With values
        validation2 = EquationValidation(
            is_valid=False, simplified="2x = 4", error_code="too_big_step"
        )
        self.assertEqual(validation2.simplified, "2x = 4")
        self.assertEqual(validation2.error_code, "too_big_step")

        # Test 3: Mixed
        validation3 = EquationValidation(
            is_valid=True, simplified="x = 2", error_code=None
        )
        self.assertEqual(validation3.simplified, "x = 2")
        self.assertIsNone(validation3.error_code)

    def test_model_serialization_with_none_values(self):
        """
        Test that models with None optional fields serialize correctly.

        This is crucial for API responses where None fields should be
        properly represented in JSON output.
        """

        class ValidationResult(BaseModel):
            status: str
            message: Optional[str] = None
            error_code: Optional[str] = None

        result = ValidationResult(
            status="error", message="Invalid equation", error_code="syntax_error"
        )

        # Verify model_dump includes all fields
        dumped = result.model_dump()
        self.assertEqual(dumped["status"], "error")
        self.assertEqual(dumped["message"], "Invalid equation")
        self.assertEqual(dumped["error_code"], "syntax_error")

        # With None values
        result_with_none = ValidationResult(status="ok", message=None, error_code=None)
        dumped_none = result_with_none.model_dump()
        self.assertEqual(dumped_none["status"], "ok")
        self.assertIsNone(dumped_none["message"])
        self.assertIsNone(dumped_none["error_code"])

    def test_union_type_alternative_syntax(self):
        """
        Test that Python 3.10+ union syntax (T | None) also works in Pydantic v2.
        """

        class ModernValidation(BaseModel):
            result: str
            # Modern Python 3.10+ syntax
            error_code: str | None = None

        validation = ModernValidation(result="2x + 3", error_code=None)
        self.assertIsNone(validation.error_code)

        validation_with_error = ModernValidation(
            result="bad", error_code="invalid_format"
        )
        self.assertEqual(validation_with_error.error_code, "invalid_format")


if __name__ == "__main__":
    unittest.main()
