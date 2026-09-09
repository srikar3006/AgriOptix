from optimization.solver.engine import solve_demo

def test_not_highest_quote():
    result = solve_demo(1550)
    assert result["name"] == "Buyer B"
    assert result["net_per_kg"] == 22.6
