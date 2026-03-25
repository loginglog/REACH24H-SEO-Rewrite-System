FROM python:3.10-slim

# Creates a non-root user with an explicit UID and adds permission to access the /app folder
RUN useradd -m -u 1000 user

WORKDIR /app

# Install system dependencies if required for NLP packages
RUN apt-get update && apt-get install -y build-essential curl && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY ./python_service/requirements.txt /app/requirements.txt

# Install python dependencies
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of the python_service files
COPY ./python_service /app/

# Hugging Face Spaces requires the service to run on port 7860, and we use the non-root user
RUN chown -R user:user /app
USER user

# Ensure cache directory exists and is writable
RUN mkdir -p /app/tmp_images

EXPOSE 7860

# Command to run FastAPI via uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
