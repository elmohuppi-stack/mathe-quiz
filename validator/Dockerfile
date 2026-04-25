FROM python:3.11-slim

WORKDIR /app

COPY validator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY validator .

EXPOSE 8001

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
