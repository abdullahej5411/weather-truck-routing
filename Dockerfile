FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY . .
WORKDIR /app/backend
ENV PORT=8000
CMD gunicorn config.wsgi --bind 0.0.0.0:$PORT --timeout 120
