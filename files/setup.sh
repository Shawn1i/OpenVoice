#!/bin/bash
set -e

echo "============================================"
echo "  Rohingya Translation Pipeline - Setup"
echo "============================================"

# 1. Install Python dependencies
echo "[1/3] Installing Python packages..."
pip install --break-system-packages \
    torch \
    transformers \
    sentencepiece \
    protobuf \
    fastapi \
    uvicorn \
    anthropic \
    pydantic \
    httpx \
    2>/dev/null

# 2. Pre-download the NLLB-200 distilled model (600M params)
# This is small enough to fit on any modern GPU, large enough to be useful
echo "[2/3] Downloading NLLB-200-distilled-600M (this takes ~5 min on good internet)..."
python3 -c "
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
model_name = 'facebook/nllb-200-distilled-600M'
print('Downloading tokenizer...')
tokenizer = AutoTokenizer.from_pretrained(model_name)
print('Downloading model...')
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
print('NLLB model ready!')
"

# 3. Verify GPU access
echo "[3/3] Checking GPU..."
python3 -c "
import torch
if torch.cuda.is_available():
    print(f'GPU found: {torch.cuda.get_device_name(0)}')
    print(f'VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB')
else:
    print('WARNING: No GPU detected. Will run on CPU (slower but works).')
"

echo ""
echo "============================================"
echo "  Setup complete! Run: python3 server.py"
echo "============================================"
