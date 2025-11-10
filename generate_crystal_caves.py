
import json
import random

def generate_crystal_caves():
    area = {
        "name": "The Crystal Caves of Aeridor",
        "start_room": "entrance",
        "rooms": {},
        "quests": {
            "crystal_heart": {
                "name": "The Crystal Heart",
                "description": "A strange corruption is spreading from the heart of the Crystal Caves. Find the source and cleanse it.",
                "steps": {
                    "1": "Find the Crystal Guardian.",
                    "2": "Gather three Crystal Shards.",
                    "3": "Defeat the Corrupted Crystal Golem."
                }
            }
        }
    }

    # Generate a 20x15 grid of rooms
    grid_size_x = 20
    grid_size_y = 15
    for x in range(grid_size_x):
        for y in range(grid_size_y):
            room_id = f"cave_{x}_{y}"
            area["rooms"][room_id] = {
                "description": f"You are in a vast cavern at ({x}, {y}). The walls are lined with glowing crystals that cast a soft, ethereal light.",
                "exits": {}
            }
            if x > 0:
                area["rooms"][room_id]["exits"]["west"] = f"cave_{x-1}_{y}"
            if x < grid_size_x - 1:
                area["rooms"][room_id]["exits"]["east"] = f"cave_{x+1}_{y}"
            if y > 0:
                area["rooms"][room_id]["exits"]["north"] = f"cave_{x}_{y-1}"
            if y < grid_size_y - 1:
                area["rooms"][room_id]["exits"]["south"] = f"cave_{x}_{y+1}"

    # Add special rooms
    area["rooms"]["entrance"] = {
        "description": "You stand at the entrance to the Crystal Caves. A cool breeze emanates from within, carrying the faint hum of the crystals.",
        "exits": {"east": "cave_1_7"}
    }
    area["rooms"]["cave_1_7"]["exits"]["west"] = "entrance"

    # Add Monsters
    for _ in range(50):
        x, y = random.randint(0, grid_size_x - 1), random.randint(0, grid_size_y - 1)
        room_id = f"cave_{x}_{y}"
        if "monster" not in area["rooms"][room_id]:
             area["rooms"][room_id]["monster"] = {
                "name": "Crystal Spider", "hp": 20, "attack": 6, "defense": 4, "gold": 20, "loot": "crystal_fragment"
            }

    # Add a final boss
    area["rooms"][f"cave_{grid_size_x-1}_{grid_size_y-1}"]["monster"] = {
         "name": "Corrupted Crystal Golem", "hp": 150, "attack": 12, "defense": 8, "gold": 200
    }
    area["rooms"][f"cave_{grid_size_x-1}_{grid_size_y-1}"]["exits"]["down"] = "area6_entrance"

    # Add Quest NPC
    area["rooms"]["cave_5_5"]["npcs"] = {
        "crystal_guardian": {
            "name": "The Crystal Guardian",
            "dialogue": "The heart of the caves is corrupted. I cannot leave this chamber to cleanse it myself. Please, gather the three great Crystal Shards and bring them to me."
        }
    }

    # Add Crystal Shards
    area["rooms"]["cave_0_0"]["quest_object"] = "crystal_shard_1"
    area["rooms"]["cave_0_14"]["quest_object"] = "crystal_shard_2"
    area["rooms"]["cave_19_0"]["quest_object"] = "crystal_shard_3"

    with open('mud/areas/area5.json', 'w') as f:
        json.dump(area, f, indent=2)
    print("Crystal Caves (area5.json) generated successfully.")

if __name__ == '__main__':
    generate_crystal_caves()
