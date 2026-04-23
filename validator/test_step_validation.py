import asyncio
import unittest

from main import Step, identify_transformation, validate_step


class TestStepValidation(unittest.TestCase):
    def test_identify_divide_both_sides_for_final_solution(self):
        transformation, error = identify_transformation("4x = 24", "x = 6", ["x"])

        self.assertIsNone(error)
        self.assertEqual(transformation, "divide_both_sides")

    def test_validate_step_accepts_divide_both_sides_for_final_solution(self):
        result = asyncio.run(
            validate_step(Step(current="4x = 24", proposed="x = 6", variables=["x"]))
        )

        self.assertTrue(result.is_valid)
        self.assertTrue(result.are_equivalent)
        self.assertEqual(result.transformation_type, "divide_both_sides")
        self.assertIsNone(result.error_code)

    def test_identify_multiply_both_sides_for_fraction_equation(self):
        transformation, error = identify_transformation("x/3 = 1", "x = 3", ["x"])

        self.assertIsNone(error)
        self.assertEqual(transformation, "multiply_both_sides")


if __name__ == "__main__":
    unittest.main()
