from fastapi import FastAPI
from pydantic import BaseModel
import os

app = FastAPI()

class Expression(BaseModel):
    expression: str

class Equation(BaseModel):
    equation: str

class Step(BaseModel):
    current: str
    proposed: str

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/validate/expression")
async def validate_expression(data: Expression):
    # TODO: Implement SymPy validation
    return {
        "is_valid": True,
        "message": "Expression validation not yet implemented"
    }

@app.post("/validate/equation")
async def validate_equation(data: Equation):
    # TODO: Implement SymPy validation
    return {
        "is_valid": True,
        "message": "Equation validation not yet implemented"
    }

@app.post("/validate/step")
async def validate_step(data: Step):
    # TODO: Implement step validation with SymPy
    return {
        "is_valid": True,
        "is_equivalent": True,
        "error_code": None,
        "message": "Step validation not yet implemented"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
