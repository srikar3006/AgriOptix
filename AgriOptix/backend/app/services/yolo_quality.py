from ultralytics import YOLO

MODEL_PATH = "yolo11n.pt"

_model = None


def get_yolo_model():
    global _model

    if _model is None:
        _model = YOLO(MODEL_PATH)

    return _model


def detect_objects(image_path: str) -> list[dict]:
    model = get_yolo_model()

    results = model(image_path, verbose=False)

    detections = []

    for result in results:
        if result.boxes is None:
            continue

        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])

            detections.append({
                "class_id": class_id,
                "class_name": result.names[class_id],
                "confidence": round(confidence, 4),
                "box": [round(float(value), 2) for value in box.xyxy[0].tolist()],
            })

    return detections
