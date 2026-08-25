# =========================================================
# Final Lab Task 1 - Goal-Based Agent
# Automated Water Purification System
# =========================================================

# ---------- GOAL STATE (safety thresholds) ----------
MAX_TURBIDITY = 1.0      # NTU
MAX_TDS       = 300      # ppm
SAFE_PH_LOW   = 6.5
SAFE_PH_HIGH  = 8.5
TARGET_PH     = 7.2      # set-point used by the chemical doser


def show(state):
    """Return the water state as a readable string."""
    return ("Turbidity = %.1f, TDS = %.0f, Bacteria = %s, pH = %.1f"
            % (state["Turbidity"], state["TDS"], state["Bacteria"], state["pH"]))


def goal_test(state):
    """Return True only when every safety threshold is satisfied."""
    return (state["Turbidity"] <= MAX_TURBIDITY and
            state["TDS"] <= MAX_TDS and
            state["Bacteria"] is False and
            SAFE_PH_LOW <= state["pH"] <= SAFE_PH_HIGH)


def decide_action(state):
    """
    Condition-Action rules.
    Returns (reason, action_name) for the first unsatisfied goal condition,
    or None when the goal state has already been reached.
    """
    if state["Turbidity"] > 3.0:
        return ("Turbidity > 1", "Sedimentation")
    if state["Turbidity"] > MAX_TURBIDITY:
        return ("Turbidity > 1", "Filtration")
    if state["TDS"] > MAX_TDS:
        return ("TDS > 300", "Reverse Osmosis")
    if state["Bacteria"] is True:
        return ("Bacteria = True", "UV Treatment")
    if state["pH"] < SAFE_PH_LOW:
        return ("pH < 6.5", "Add Chemicals")
    if state["pH"] > SAFE_PH_HIGH:
        return ("pH > 8.5", "Add Chemicals")
    return None


def execute(action, state):
    """Apply the effect of the chosen purification action on the water."""
    if action == "Sedimentation":                       # heavy particles settle
        state["Turbidity"] = round(state["Turbidity"] * 0.10, 2)
    elif action == "Filtration":                        # fine particle removal
        state["Turbidity"] = round(state["Turbidity"] * 0.40, 2)
    elif action == "Reverse Osmosis":                   # dissolved solids removal
        state["TDS"] = round(state["TDS"] * 0.40, 2)
    elif action == "UV Treatment":                      # bacteria elimination
        state["Bacteria"] = False
    elif action == "Add Chemicals":                     # dose towards neutral pH
        state["pH"] = TARGET_PH
    return state


def water_purification_agent(state):
    """Goal-based agent: keep acting until the water reaches the goal state."""
    print("Initial water quality:", show(state))
    print("-" * 62)

    while not goal_test(state):
        rule = decide_action(state)
        if rule is None:
            break
        reason, action = rule
        print("→ %s → Action Taken: %s" % (reason, action))
        state = execute(action, state)
        print("   Updated state: " + show(state))

    print("-" * 62)
    print("Water quality after treatment:", show(state))
    print("Goal Achieved: Water is purified and safe for drinking.")
    return state


# ---------------------- MAIN ----------------------
if __name__ == "__main__":
    water_sample = {
        "Turbidity": 5.0,
        "TDS": 700,
        "Bacteria": True,
        "pH": 5.8
    }
    water_purification_agent(water_sample)
