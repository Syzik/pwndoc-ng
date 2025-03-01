#!/bin/bash

apt-get update && apt-get install -y curl
/bin/ollama serve &

# waiting for Ollama to be ready
until curl -s http://localhost:11434/api/tags > /dev/null; do
    echo "Attente du démarrage d'Ollama..."
    sleep 2
done

# Check if the model is already installed
MODEL_NAME=${OLLAMA_MODEL:-mistral}
if ! curl -s http://localhost:11434/api/tags | grep -q "\"$MODEL_NAME\""; then
    echo "Téléchargement du modèle $MODEL_NAME..."
    curl -s http://localhost:11434/api/pull -d "{\"name\": \"$MODEL_NAME\"}"
fi

# Keep the process running
wait
