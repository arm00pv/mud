import json
import random

def generate_forest():
    """Procedurally generates a 100-room forest area for the MUD game."""

    # --- Configuration ---
    GRID_SIZE = 10
    NUM_ROOMS = GRID_SIZE * GRID_SIZE

    # --- Data Structures ---
    rooms = {}

    # --- Maze Generation (using Randomized Depth-First Search) ---
    stack = []
    visited = set()

    # Start at a random cell
    start_x, start_y = random.randint(0, GRID_SIZE - 1), random.randint(0, GRID_SIZE - 1)
    stack.append((start_x, start_y))
    visited.add((start_x, start_y))

    while stack:
        x, y = stack[-1]

        # Get unvisited neighbors
        neighbors = []
        if x > 0 and (x - 1, y) not in visited: neighbors.append(('west', (x - 1, y)))
        if x < GRID_SIZE - 1 and (x + 1, y) not in visited: neighbors.append(('east', (x + 1, y)))
        if y > 0 and (x, y - 1) not in visited: neighbors.append(('north', (x, y - 1)))
        if y < GRID_SIZE - 1 and (x, y + 1) not in visited: neighbors.append(('south', (x, y + 1)))

        if neighbors:
            direction, (nx, ny) = random.choice(neighbors)

            # Create two-way exits
            current_room_id = f"room_{x}_{y}"
            next_room_id = f"room_{nx}_{ny}"

            if current_room_id not in rooms: rooms[current_room_id] = {'exits': {}}
            if next_room_id not in rooms: rooms[next_room_id] = {'exits': {}}

            rooms[current_room_id]['exits'][direction] = next_room_id

            opposite = {'north': 'south', 'south': 'north', 'east': 'west', 'west': 'east'}
            rooms[next_room_id]['exits'][opposite[direction]] = current_room_id

            visited.add((nx, ny))
            stack.append((nx, ny))
        else:
            stack.pop()

    # --- Description and Faction Generation ---
    ADJECTIVES = ["sun-dappled", "misty", "ancient", "mossy", "dark", "vibrant", "serene", "eerie"]
    NOUNS = ["clearing", "grove", "thicket", "hollow", "path", "glade", "copse"]
    DETAILS = [
        "The air is thick with the scent of pine and damp earth.",
        "A gentle breeze rustles the leaves overhead.",
        "The sound of a distant woodpecker echoes through the trees.",
        "Sunlight streams through the canopy, creating shifting patterns on the forest floor.",
        "A small, babbling brook trickles nearby."
    ]

    for i in range(GRID_SIZE):
        for j in range(GRID_SIZE):
            room_id = f"room_{i}_{j}"
            if room_id in rooms:
                desc = f"You are in a {random.choice(ADJECTIVES)} {random.choice(NOUNS)}. {random.choice(DETAILS)}"

                # Assign Faction Zones (Fairies in NW, Nymphs in SE)
                if i < GRID_SIZE / 2 and j < GRID_SIZE / 2:
                    rooms[room_id]['faction'] = 'fairy'
                    desc += " Delicate, shimmering lights float in the air, and you hear the faint sound of tiny bells."
                elif i > GRID_SIZE / 2 and j > GRID_SIZE / 2:
                    rooms[room_id]['faction'] = 'nymph'
                    desc += " Thick, gnarled vines hang from the trees, and the air is heavy and humid."
                else:
                    rooms[room_id]['faction'] = 'contested'

                rooms[room_id]['description'] = desc

    # --- Quest Item Placement ---
    for _ in range(20): # Place 20 acorn caches
        room_id = random.choice(list(rooms.keys()))
        rooms[room_id]['quest_object'] = 'acorn_cache'
        rooms[room_id]['description'] += " You see a hidden cache of acorns here."

    # --- Final Area Structure ---
    area_data = {
        "name": "The Great Forest",
        "description": "A vast and ancient forest, home to warring factions of fairies and nymphs.",
        "start_room": f"room_{start_x}_{start_y}",
        "rooms": rooms,
        "quests": {
            "acorn_war": {
                "name": "The Acorn War",
                "description": "The fairies and nymphs are at war over the collection of acorns for their harvest festivals. You can choose to help one side or hinder the other.",
                "steps": [
                    "Collect acorns for the fairies.",
                    "Collect acorns for the nymphs."
                ],
                "reward": "The favor of the winning faction."
            }
        }
    }

    return area_data

if __name__ == "__main__":
    forest_data = generate_forest()
    with open('mud/areas/area1.json', 'w') as f:
        json.dump(forest_data, f, indent=2)
    print("New 100-room forest generated and saved to mud/areas/area1.json")
