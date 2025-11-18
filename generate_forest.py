import json
import random

def add_bridge_to_bailon(rooms, grid_size):
    """Finds a suitable edge room and adds a bridge connection."""

    # Find a room on the eastern edge of the forest
    bridge_start_room = None
    for y in range(grid_size):
        room_id = f"room_{grid_size-1}_{y}"
        if room_id in rooms:
            bridge_start_room = room_id
            break

    if bridge_start_room:
        bridge_room_id = "area1_bridge_room"

        # Connect the forest room to the bridge room
        rooms[bridge_start_room]["exits"]["east"] = bridge_room_id

        # Create the bridge room itself
        rooms[bridge_room_id] = {
            "description": "You are on a shimmering bridge of light that stretches into the sky towards a floating city.",
            "exits": {
                "west": bridge_start_room,
                "bridge": "area2_p_2_2" # Connects to Bailon's start room
            }
        }

def generate_forest():
    """Procedurally generates a 100-room forest area for the MUD game."""

    GRID_SIZE = 10
    rooms = {}

    # --- Maze Generation ---
    stack = []
    visited = set()
    start_x, start_y = random.randint(0, GRID_SIZE - 1), random.randint(0, GRID_SIZE - 1)
    stack.append((start_x, start_y))
    visited.add((start_x, start_y))

    while stack:
        x, y = stack[-1]
        neighbors = []
        if x > 0 and (x - 1, y) not in visited: neighbors.append(('west', (x - 1, y)))
        if x < GRID_SIZE - 1 and (x + 1, y) not in visited: neighbors.append(('east', (x + 1, y)))
        if y > 0 and (x, y - 1) not in visited: neighbors.append(('north', (x, y - 1)))
        if y < GRID_SIZE - 1 and (x, y + 1) not in visited: neighbors.append(('south', (x, y + 1)))

        if neighbors:
            direction, (nx, ny) = random.choice(neighbors)
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
    ADJECTIVES = ["sun-dappled", "misty", "ancient", "mossy", "dark", "vibrant", "serene", "eerie", "whispering", "luminous", "shadowy", "forgotten", "verdant", "primeval"]
    NOUNS = ["clearing", "grove", "thicket", "hollow", "path", "glade", "copse", "dell", "meadow", "thicket", "brookside", "fen"]
    DETAILS = [
        "The air is thick with the scent of pine and damp earth.",
        "A gentle breeze whispers through the leaves, carrying the melody of a hidden bird.",
        "The sound of a distant woodpecker echoes through the trees, a steady, rhythmic drumming.",
        "Sunlight streams through the canopy in golden shafts, illuminating dust motes dancing in the air.",
        "A small, babbling brook gurgles nearby, its water crystal clear over smooth stones.",
        "A carpet of emerald moss blankets the ground, muffling your footsteps.",
        "The gnarled roots of an ancient oak twist across the path like sleeping serpents.",
        "Strange, bioluminescent fungi cast a soft, ethereal glow on the surroundings.",
        "You hear the faint rustling of some unseen creature in the undergrowth.",
        "A sense of profound peace and timelessness pervades this place."
    ]

    for i in range(GRID_SIZE):
        for j in range(GRID_SIZE):
            room_id = f"room_{i}_{j}"
            if room_id in rooms:
                desc = f"You are in a {random.choice(ADJECTIVES)} {random.choice(NOUNS)}. {random.choice(DETAILS)}"
                if i < GRID_SIZE / 2 and j < GRID_SIZE / 2:
                    rooms[room_id]['faction'] = 'fairy'
                    desc += " Delicate, shimmering lights float in the air, a telltale sign of fairy presence."
                elif i > GRID_SIZE / 2 and j > GRID_SIZE / 2:
                    rooms[room_id]['faction'] = 'nymph'
                    desc += " Thick, gnarled vines, pulsing with a faint green light, hang from the trees, marking nymph territory."
                else:
                    rooms[room_id]['faction'] = 'contested'
                rooms[room_id]['description'] = desc

    # --- Quest Item Placement ---
    for _ in range(20):
        room_id = random.choice(list(rooms.keys()))
        if "quest_object" not in rooms[room_id]:
             rooms[room_id]['quest_object'] = 'acorn_cache'
             rooms[room_id]['description'] += " You see a hidden cache of acorns tucked into the nook of a tree."

    # --- Add Bridge ---
    add_bridge_to_bailon(rooms, GRID_SIZE)

    # --- Add Hermit NPC for Main Quest ---
    dead_end_rooms = [rid for rid, r in rooms.items() if len(r['exits']) == 1]
    if dead_end_rooms:
        hermit_room = random.choice(dead_end_rooms)
        rooms[hermit_room]["npcs"] = {
            "hermit": {
                "name": "A mysterious Hermit",
                "dialogue": "The world is falling out of balance. The Shattered Amulet must be reforged. Find the fragments in the world's most dangerous corners: the heart of the sky city, the deepest part of the desert, and the belly of the beast that sleeps in the sunken city.",
                "quest": "shattered_amulet"
            }
        }

    # --- Final Area Structure ---
    area_data = {
        "name": "The Great Forest",
        "description": "A vast and ancient forest, home to warring factions of fairies and nymphs.",
        "start_room": f"room_{start_x}_{start_y}",
        "rooms": rooms,
        "quests": {
            "acorn_war": { "name": "The Acorn War", "description": "...", "steps": [], "reward": "..." },
            "shattered_amulet": { "name": "The Shattered Amulet", "description": "Reforge the Shattered Amulet to restore balance to the world." }
        }
    }
    return area_data

if __name__ == "__main__":
    forest_data = generate_forest()
    with open('mud/areas/area1.json', 'w') as f:
        json.dump(forest_data, f, indent=2)
    print("New 100-room forest with bridge generated and saved to mud/areas/area1.json")
