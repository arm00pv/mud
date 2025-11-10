
import json
import random

def generate_sunken_city():
    area = {
        "name": "The Sunken City of Y'ha-nthlei",
        "start_room": "gateway",
        "rooms": {},
        "quests": {
            "call_of_the_deep": {
                "name": "The Call of the Deep",
                "description": "An ancient evil stirs in the depths. Find the lost Trident of the Tides to restore balance.",
                "steps": {
                    "1": "Find the ancient merfolk seer.",
                    "2": "Recover the three pieces of the Trident.",
                    "3": "Defeat the Kraken."
                }
            }
        }
    }

    # Generate a 15x15 grid of rooms
    grid_size = 15
    for x in range(grid_size):
        for y in range(grid_size):
            room_id = f"room_{x}_{y}"
            area["rooms"][room_id] = {
                "description": f"You are in a dimly lit, water-filled chamber at ({x}, {y}). Strange coral formations glow with an eerie light.",
                "exits": {},
                "environment": "underwater"
            }
            if x > 0:
                area["rooms"][room_id]["exits"]["west"] = f"room_{x-1}_{y}"
            if x < grid_size - 1:
                area["rooms"][room_id]["exits"]["east"] = f"room_{x+1}_{y}"
            if y > 0:
                area["rooms"][room_id]["exits"]["north"] = f"room_{x}_{y-1}"
            if y < grid_size - 1:
                area["rooms"][room_id]["exits"]["south"] = f"room_{x}_{y+1}"

    # Add special rooms
    area["rooms"]["gateway"] = {
        "description": "You stand at the entrance to the sunken city. A powerful current pulls you in. The water here is breathable thanks to a strange magical field, but you feel it weakening further in.",
        "exits": {"east": "room_1_7"},
        "environment": "underwater" # Still underwater, but the quest will start here
    }
    area["rooms"]["room_1_7"]["exits"]["west"] = "gateway" # Connect back to gateway

    # Add Monsters
    for _ in range(30):
        x, y = random.randint(0, grid_size - 1), random.randint(0, grid_size - 1)
        room_id = f"room_{x}_{y}"
        if "monster" not in area["rooms"][room_id]:
             area["rooms"][room_id]["monster"] = {
                "name": "Deep One", "hp": 15, "attack": 4, "defense": 2, "gold": 15
            }

    # Add a final boss
    area["rooms"][f"room_{grid_size-1}_{grid_size-1}"]["monster"] = {
         "name": "Kraken", "hp": 100, "attack": 10, "defense": 5, "gold": 100, "loot": "amulet_fragment_sea"
    }
    area["rooms"][f"room_{grid_size-1}_{grid_size-1}"]["exits"]["down"] = "area5_entrance"

    # Add Quest NPC
    area["rooms"]["room_5_5"]["npcs"] = {
        "merfolk_seer": {
            "name": "The Merfolk Seer",
            "dialogue": "You seek the Trident of the Tides. It was shattered into three pieces. Find them, and you may stand a chance against the darkness."
        }
    }

    # Add Trident pieces
    area["rooms"]["room_0_0"]["quest_object"] = "trident_piece_1"
    area["rooms"]["room_0_14"]["quest_object"] = "trident_piece_2"
    area["rooms"]["room_14_0"]["quest_object"] = "trident_piece_3"

    with open('mud/areas/area4.json', 'w') as f:
        json.dump(area, f, indent=2)
    print("Sunken City (area4.json) generated successfully.")

if __name__ == '__main__':
    generate_sunken_city()
