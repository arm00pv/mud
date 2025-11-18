
import json
import random

def generate_volcano():
    area = {
        "name": "The Volcanic Tunnels of Mol'gor",
        "start_room": "entrance",
        "rooms": {},
        "quests": {
            "heart_of_the_mountain": {
                "name": "The Heart of the Mountain",
                "description": "A powerful elemental is trapped within the volcano's core. Find a way to free it.",
                "steps": {
                    "1": "Find the Elder Fire Drake.",
                    "2": "Craft a Runecarved Key.",
                    "3": "Defeat the Magma Lord."
                }
            }
        }
    }

    # --- Description Templates ---
    ADJECTIVES = ["sweltering", "scorching", "choking", "ash-filled", "magma-lit", "unstable", "brimstone"]
    NOUNS = ["tunnel", "cavern", "magma tube", "fissure", "chamber", "caldera", "vent"]
    DETAILS = [
        "Rivers of magma flow in channels along the floor, casting a fiery, dancing glow.",
        "The air is thick with sulfur and ash, making it difficult to breathe.",
        "The ground trembles periodically, a reminder of the immense power churning beneath you.",
        "Sharp, glassy obsidian shards litter the floor, crunching underfoot.",
        "Geysers of scalding steam erupt from cracks in the rock with a deafening hiss.",
        "The heat is so intense it feels like a physical weight pressing down on you.",
        "Strange, heat-resistant fungi grow in bizarre formations on the cooler rock faces."
    ]

    grid_size_x = 20
    grid_size_y = 15
    for x in range(grid_size_x):
        for y in range(grid_size_y):
            room_id = f"volcano_{x}_{y}"
            adj = random.choice(ADJECTIVES)
            noun = random.choice(NOUNS)
            detail = random.choice(DETAILS)
            description = f"You are in a {adj} {noun}. {detail}"

            is_hot_room = random.random() < 0.3 # 30% chance for a room to have intense heat
            area["rooms"][room_id] = {
                "description": description,
                "exits": {},
                "environment": "intense_heat" if is_hot_room else "normal"
            }
            if x > 0:
                area["rooms"][room_id]["exits"]["west"] = f"volcano_{x-1}_{y}"
            if x < grid_size_x - 1:
                area["rooms"][room_id]["exits"]["east"] = f"volcano_{x+1}_{y}"
            if y > 0:
                area["rooms"][room_id]["exits"]["north"] = f"volcano_{x}_{y-1}"
            if y < grid_size_y - 1:
                area["rooms"][room_id]["exits"]["south"] = f"volcano_{x}_{y+1}"

    # Add special rooms
    area["rooms"]["entrance"] = {
        "description": "A blast of hot air greets you at the entrance to the volcanic tunnels. The air shimmers with heat.",
        "exits": {"south": "volcano_10_1"},
        "environment": "normal"
    }
    area["rooms"]["volcano_10_1"]["exits"]["north"] = "entrance"

    # Add Monsters
    for _ in range(60):
        x, y = random.randint(0, grid_size_x - 1), random.randint(0, grid_size_y - 1)
        room_id = f"volcano_{x}_{y}"
        if "monster" not in area["rooms"][room_id]:
             monster_type = random.choice(["Fire Elemental", "Lava Slime"])
             if monster_type == "Fire Elemental":
                 area["rooms"][room_id]["monster"] = {
                    "name": "Fire Elemental", "hp": 25, "attack": 8, "defense": 5, "gold": 30, "loot": "obsidian_chunk"
                }
             else:
                area["rooms"][room_id]["monster"] = {
                    "name": "Lava Slime", "hp": 15, "attack": 5, "defense": 8, "gold": 20
                }


    # Add a final boss
    area["rooms"][f"volcano_{grid_size_x-1}_{grid_size_y-1}"]["monster"] = {
         "name": "Magma Lord", "hp": 300, "attack": 25, "defense": 15, "gold": 1000, "loot": "dragon_scale"
    }

    # Add Quest NPC
    area["rooms"]["volcano_5_5"]["npcs"] = {
        "fire_drake": {
            "name": "The Elder Fire Drake",
            "dialogue": "Hssst... a mortal. The Magma Lord holds the heart of this mountain captive. Only a key carved with runes can break the seal to his chamber. Bring me the materials, and I shall show you the way."
        }
    }

    with open('mud/areas/area6.json', 'w') as f:
        json.dump(area, f, indent=2)
    print("Volcanic Tunnels (area6.json) generated successfully.")

if __name__ == '__main__':
    generate_volcano()
