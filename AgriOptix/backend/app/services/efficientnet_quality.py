import io

import torch
from PIL import Image
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights


_WEIGHTS = EfficientNet_B0_Weights.DEFAULT
_MODEL = efficientnet_b0(weights=_WEIGHTS)
_MODEL.eval()

_PREPROCESS = _WEIGHTS.transforms()
_CATEGORIES = _WEIGHTS.meta["categories"]


def _predict(image: Image.Image, top_k: int = 5) -> dict:
    image = image.convert("RGB")
    tensor = _PREPROCESS(image).unsqueeze(0)

    with torch.no_grad():
        output = _MODEL(tensor)
        probabilities = torch.softmax(output, dim=1)[0]

    values, indices = torch.topk(probabilities, top_k)

    predictions = [
        {
            "label": _CATEGORIES[index.item()],
            "confidence": round(float(value) * 100, 2),
        }
        for value, index in zip(values, indices)
    ]

    return {
        "model": "EfficientNet-B0",
        "weights": "ImageNet pretrained",
        "predictions": predictions,
    }


def analyze_image(image_path: str, top_k: int = 5) -> dict:
    """Run EfficientNet-B0 on an image file."""
    image = Image.open(image_path)
    return _predict(image, top_k)


def analyze_image_bytes(raw: bytes, top_k: int = 5) -> dict:
    """Run EfficientNet-B0 directly on uploaded image bytes."""
    image = Image.open(io.BytesIO(raw))
    return _predict(image, top_k)
