# Final Lab Task 1
# Goal-Based Agent : Automated Water Purification System


def show(w):
    return (f"Turbidity = {w['Turbidity']}, TDS = {w['TDS']}, "
            f"Bacteria = {w['Bacteria']}, pH = {w['pH']}")


def goal_reached(w):
    if w["Turbidity"] <= 1 and w["TDS"] <= 300 and w["Bacteria"] == False:
        if 6.5 <= w["pH"] <= 8.5:
            return True
    return False


# sensor readings of the incoming water
water = {"Turbidity": 5.0, "TDS": 700, "Bacteria": True, "pH": 5.8}

print("Initial water quality:", show(water))

# keep applying the rules until the goal state is reached
while not goal_reached(water):

    if water["Turbidity"] > 3:
        print("→ Turbidity > 1 → Action Taken: Sedimentation")
        water["Turbidity"] = round(water["Turbidity"] * 0.1, 2)

    elif water["Turbidity"] > 1:
        print("→ Turbidity > 1 → Action Taken: Filtration")
        water["Turbidity"] = round(water["Turbidity"] * 0.4, 2)

    elif water["TDS"] > 300:
        print("→ TDS > 300 → Action Taken: Reverse Osmosis")
        water["TDS"] = int(water["TDS"] * 0.4)

    elif water["Bacteria"] == True:
        print("→ Bacteria = True → Action Taken: UV Treatment")
        water["Bacteria"] = False

    elif water["pH"] < 6.5:
        print("→ pH < 6.5 → Action Taken: Add Chemicals")
        water["pH"] = 7.2

    elif water["pH"] > 8.5:
        print("→ pH > 8.5 → Action Taken: Add Chemicals")
        water["pH"] = 7.2

    print("   Updated state:", show(water))

print("Water quality after treatment:", show(water))
print("Goal Achieved: Water is purified and safe for drinking.")
