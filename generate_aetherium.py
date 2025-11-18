
import json
import random

def generate_aetherium():
    area = {
        "name": "The Aetherium",
        "start_room": "entrance",
        "rooms": {},
        "quests": {
            "starfall": {
                "name": "The Starfall",
                "description": "A celestial body is hurtling towards the world. Forge the Starcaller's Staff to avert the catastrophe.",
                "steps": {
                    "1": "Find the Star-Gazer.",
                    "2": "Gather Stardust and Aetherial Essence.",
                    "3": "Defeat the Void Titan."
                }
            }
        }
    }

    # --- Description Templates ---
    ADJECTIVES = ["cosmic", "star-strewn", "void-like", "shimmering", "ethereal", "timeless", "blinding"]
    NOUNS = ["void", "nebula", "starfield", "continuum", "expanse", "galaxy's edge", "creation's forge"]
    DETAILS = [
        "You are floating in a cosmic void. Kaleidoscopic nebulae swirl in the infinite distance, and the stars are blindingly bright.",
        "There is no up or down here, only the silent, majestic dance of celestial bodies.",
        "Wisps of colorful, gaseous stardust drift lazily past you.",
        "The silence is absolute and profound, a stark contrast to the visual splendor.",
        "You feel a sense of both insignificance and connection to the vastness of the universe.",
        "A distant supernova blossoms like a silent flower, a testament to the universe's cycle of creation and destruction.",
        "Paths of crystalline starlight crisscross the void, forming ethereal walkways."
    ]

    grid_size_x = 15
    grid_size_y = 15
    for x in range(grid_size_x):
        for y in range(grid_size_y):
            room_id = f"aether_{x}_{y}"
            adj = random.choice(ADJECTIVES)
            noun = random.choice(NOUNS)
            detail = random.choice(DETAILS)
            description = f"You are in a {adj} {noun}. {detail}"

            area["rooms"][room_id] = {
                "description": description,
                "exits": {}
            }
            if x > 0:
                area["rooms"][room_id]["exits"]["drift west"] = f"aether_{x-1}_{y}"
            if x < grid_size_x - 1:
                area["rooms"][room_id]["exits"]["drift east"] = f"aether_{x+1}_{y}"
            if y > 0:
                area["rooms"][room_id]["exits"]["ascend"] = f"aether_{x}_{y-1}"
            if y < grid_size_y - 1:
                area["rooms"][room_id]["exits"]["descend"] = f"aether_{x}_{y+1}"

    # Add special rooms
    area["rooms"]["entrance"] = {
        "description": "You have stepped through a portal into a realm of pure starlight. The air hums with cosmic energy.",
        "exits": {"drift east": "aether_1_7"}
    }
    area["rooms"]["aether_1_7"]["exits"]["drift west"] = "entrance"

    # Add Monsters
    for _ in range(40):
        x, y = random.randint(0, grid_size_x - 1), random.randint(0, grid_size_y - 1)
        room_id = f"aether_{x}_{y}"
        if "monster" not in area["rooms"][room_id]:
             monster_type = random.choice(["Starlight Wraith", "Void Hound"])
             if monster_type == "Starlight Wraith":
                 area["rooms"][room_id]["monster"] = {
                    "name": "Starlight Wraith", "hp": 50, "attack": 15, "defense": 10, "gold": 50, "loot": "stardust"
                }
             else:
                area["rooms"][room_id]["monster"] = {
                    "name": "Void Hound", "hp": 40, "attack": 20, "defense": 5, "gold": 40
                }


    # Add a final boss
    area["rooms"][f"aether_{grid_size_x-1}_{grid_size_y-1}"]["monster"] = {
         "name": "Void Titan", "hp": 500, "attack": 30, "defense": 20, "gold": 2000, "loot": "aetherial_essence"
    }

    # Add Quest NPC
    area["rooms"]["aether_5_5"]["npcs"] = {
        "star_gazer": {
            "name": "The Star-Gazer",
            "dialogue": "A shadow falls upon your world. A star... it is not falling, it is being pushed. You must forge the Starcaller's Staff to pull it back into its celestial cradle."
        }
    }

    with open('mud/areas/area8.json', 'w') as f:
        json.dump(area, f, indent=2)
    print("Aetherium (area8.json) generated successfully.")

if __name__ == '__main__':
    generate_aetherium()
