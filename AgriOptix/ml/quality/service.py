class QualityService:
    """Interface for YOLO/EfficientNet/OpenCV inference.
    Demo implementation is intentionally deterministic and labelled."""
    def analyze(self, image_path=None):
        return {"grade":"A","confidence":92,"quality_score":91,"mode":"DEMO / SIMULATION"}
