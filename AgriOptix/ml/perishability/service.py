class PerishabilityService:
    """Interface for XGBoost/LightGBM perishability prediction."""
    def predict(self, crop, grade, harvest_time, temperature=None, humidity=None):
        return {"shelf_life_days":3.2,"urgency":"HIGH","mode":"DEMO / SIMULATION"}
