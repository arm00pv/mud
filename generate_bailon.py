import json
import random

# --- Data Templates ---
MONSTERS = {
    "siege_goblin": {"name": "Siege Goblin", "hp": 8, "attack": 3, "defense": 2, "gold": 5},
    "glutton_orc": {"name": "Glutton Orc", "hp": 12, "attack": 4, "defense": 1, "gold": 8},
}

SHOPS = {
    "armory": {
        "name": "The Goblin's Anvil",
        "inventory": ["leather_armor", "iron_sword"]
    },
    "apothecary": {
        "name": "Orcish Remedies",
        "inventory": ["ring_of_protection"]
    }
}

# --- Generation Logic ---
def generate_zone(width, height, prefix, description_parts):
    """Generates a grid of interconnected rooms for a zone."""
    rooms = {}
    for y in range(height):
        for x in range(width):
            room_id = f"{prefix}_{x}_{y}"
            adj, noun, detail = map(random.choice, description_parts)
            desc = f"You are in a {adj} {noun}. {detail}"

            rooms[room_id] = {"description": desc, "exits": {}}

            # Connect to neighbors
            if x > 0: rooms[room_id]["exits"]["west"] = f"{prefix}_{x-1}_{y}"
            if x < width - 1: rooms[room_id]["exits"]["east"] = f"{prefix}_{x+1}_{y}"
            if y > 0: rooms[room_id]["exits"]["north"] = f"{prefix}_{x}_{y-1}"
            if y < height - 1: rooms[room_id]["exits"]["south"] = f"{prefix}_{x}_{y+1}"

    return rooms

def generate_bailon():
    """Main function to generate the entire city of Bailon."""
    all_rooms = {}

    # 1. Generate Zones
    plaza_parts = [
        ["grand", "open", "wind-swept", "sun-bleached", "serene"],
        ["plaza", "square", "courtyard", "terrace"],
        [
            "Intricate, geometric patterns are carved into the marble floor.",
            "A fountain, now dry, sits in the center, a testament to a grander age.",
            "The sky above is a brilliant, unending blue.",
            "You feel a strange lightness, as if gravity itself is weaker here.",
            "The distant sound of wind chimes creates a lonely, beautiful melody."
        ]
    ]
    marketplace_parts = [
        ["crowded", "noisy", "makeshift", "chaotic", "bustling"],
        ["market street", "bazaar", "shanty town", "trading post"],
        [
            "The air is thick with the smell of strange spices and roasting meat.",
            "Merchants with leathery skin and cunning eyes hawk their wares from behind rickety stalls.",
            "A cacophony of shouts, haggling, and goblin laughter fills the air.",
            "Tattered banners and hides are stretched between buildings, providing meager shade.",
            "You see goods from a dozen different lands, plundered and traded."
        ]
    ]
    historical_parts = [
        ["ancient", "crumbling", "silent", "majestic", "weathered"],
        ["ruin", "monument plaza", "library atrium", "garden terrace"],
        [
            "The stones feel heavy with history, humming with a forgotten power.",
            "Elaborate carvings on the walls depict a civilization that worshipped the sky.",
            "A profound silence hangs in the air, broken only by the whistling wind.",
            "Statues of winged beings, their faces eroded by time, stand like silent sentinels.",
            "You feel as though you are walking through a memory."
        ]
    ]
    undercity_parts = [
        ["damp", "dark", "twisting", "fungal", "oppressive"],
        ["cave", "tunnel", "sewer", "under-croft", "chasm"],
        [
            "Water drips from the ceiling, each drop echoing in the vast darkness.",
            "Bioluminescent moss casts a sickly, green-blue light on the path.",
            "The air is cold and smells of decay and wet stone.",
            "You hear the skittering of unseen things in the shadows.",
            "This place feels like the city's forgotten underbelly, a place of secrets and refuse."
        ]
    ]
    castle_parts = [
        ["fortified", "imposing", "cold", "brutish", "drafty"],
        ["parapet", "hall", "barracks", "armory", "rampart"],
        [
            "Crude banners of the Siege Goblins, depicting a cracked skull, hang from the walls.",
            "The air is acrid with the smoke of goblin fires and unwashed bodies.",
            "The architecture is functional and brutal, built for war, not comfort.",
            "Through a narrow slit in the wall, you can see the clouds drifting far below.",
            "The sound of guttural war chants echoes from deeper within the castle."
        ]
    ]
    quest_area_parts = [
        ["secret", "dusty", "forgotten", "sacred", "silent"],
        ["passage", "chamber", "tomb", "sanctum", "observatory"],
        [
            "You feel a hidden, powerful presence here, watching your every move.",
            "The air is still and heavy with the weight of centuries.",
            "Intricate celestial maps are inlaid on the floor in tarnished silver.",
            "Dust motes dance in a single shaft of light from a crack in the ceiling.",
            "This room was clearly a place of great importance, now lost to time."
        ]
    ]

    plaza = generate_zone(5, 5, "p", plaza_parts)
    marketplace = generate_zone(8, 8, "m", marketplace_parts)
    historical = generate_zone(10, 10, "h", historical_parts)
    undercity = generate_zone(10, 10, "u", undercity_parts)
    castle = generate_zone(10, 10, "c", castle_parts)
    castle_quest_area = generate_zone(5, 10, "cq", quest_area_parts)

    # Add all rooms to the main dictionary
    all_rooms.update(plaza)
    all_rooms.update(marketplace)
    all_rooms.update(historical)
    all_rooms.update(undercity)
    all_rooms.update(castle)
    all_rooms.update(castle_quest_area)

    # 2. Connect Zones (Manually)
    plaza["p_2_0"]["exits"]["north"] = "m_2_7" # Plaza to Marketplace
    marketplace["m_2_7"]["exits"]["south"] = "p_2_0"

    plaza["p_4_2"]["exits"]["east"] = "h_0_2" # Plaza to Historical
    historical["h_0_2"]["exits"]["west"] = "p_4_2"

    plaza["p_0_2"]["exits"]["west"] = "c_9_5" # Plaza to Castle
    castle["c_9_5"]["exits"]["east"] = "p_0_2"

    castle["c_2_2"]["exits"]["down"] = "u_5_5" # Castle to Undercity
    undercity["u_5_5"]["exits"]["up"] = "c_2_2"

    castle["c_7_7"]["exits"]["secret"] = "cq_0_0" # Castle to Quest Area
    castle_quest_area["cq_0_0"]["exits"]["out"] = "c_7_7"

    # 3. Populate Zones
    # Shops in Marketplace
    marketplace["m_3_3"]["shop"] = SHOPS["armory"]
    marketplace["m_5_5"]["shop"] = SHOPS["apothecary"]
    marketplace["m_1_1"]["bank"] = True

    # Monsters
    for room_id in castle:
        if random.random() < 0.2: castle[room_id]["monster"] = MONSTERS["siege_goblin"].copy()
    for room_id in undercity:
        if random.random() < 0.25: undercity[room_id]["monster"] = MONSTERS["glutton_orc"].copy()

    # 4. Quests
    castle["c_1_1"]["quest_giver"] = "goblin_chief"
    undercity["u_8_8"]["quest_giver"] = "orc_shaman"
    historical["h_5_5"]["quest_giver"] = "historian_ghost"

    # Add final boss and amulet fragment
    castle_quest_area["cq_4_9"]["monster"] = {
        "name": "The Ghost of King Bailon", "hp": 200, "attack": 15, "defense": 10, "gold": 300
    }
    castle_quest_area["cq_4_9"]["quest_object"] = "amulet_fragment_sky"

    # Add Arena Master
    marketplace["m_7_7"]["npcs"] = {
        "arena_master": {
            "name": "Arena Master",
            "dialogue": "Do you wish to test your mettle against another champion? I can send you to the Obsidian Arena.",
            "transport": "area7_arena"
        }
    }

    # Add portal to Aetherium
    plaza["p_2_2"]["exits"]["portal"] = "area8_entrance"

    # Define start room and connect bridge from Area 1
    start_room = "p_2_2"
    all_rooms[start_room]["description"] += " A shimmering bridge of light connects back to the Great Forest."
    all_rooms[start_room]["exits"]["bridge"] = "area1_bridge_room"

    # Add a new western gate to the desert
    desert_gate_room = "h_0_5"
    all_rooms[desert_gate_room]["description"] += " A massive sandstone gate leads west, out into a vast desert."
    all_rooms[desert_gate_room]["exits"]["west"] = "area3_d_19_10"

    # 5. Final Assembly
    area_data = {
        "name": "Ancient Sky City of Bailon",
        "description": "A ruined city floating in the sky, home to warring goblins and orcs.",
        "start_room": start_room,
        "rooms": all_rooms,
        "quests": {
            "goblin_siege": {"name": "The Goblin Siege", "description": "Help the Siege Goblins fortify their castle."},
            "orc_feast": {"name": "The Orcs' Great Feast", "description": "Help the Glutton Orcs gather... ingredients."},
            "city_history": {"name": "Whispers of the Past", "description": "Uncover the secrets of Bailon's fall."}
        }
    }
    return area_data

if __name__ == "__main__":
    bailon_data = generate_bailon()
    with open('mud/areas/area2.json', 'w') as f:
        json.dump(bailon_data, f, indent=2)
    print(f"Generated Bailon with {len(bailon_data['rooms'])} rooms and saved to mud/areas/area2.json")
