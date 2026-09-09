"""Deterministic demo optimization engine.
Production hook: replace solve_demo() with OR-Tools/Pyomo MILP while retaining
the same result contract. Objective = realized revenue after logistics,
handling and expected perishability loss.
"""
def solve_demo(quantity_kg=1550):
    buyers = [
        {"name":"Buyer A","price":28,"transport":6,"loss":2.5},
        {"name":"Buyer B","price":26,"transport":2.7,"loss":0.7},
        {"name":"Buyer C","price":24,"transport":2.1,"loss":0.9},
    ]
    for b in buyers:
        b["net_per_kg"] = round(b["price"] - b["transport"] - b["loss"], 2)
    return max(buyers, key=lambda b:b["net_per_kg"])
