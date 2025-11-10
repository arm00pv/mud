import json
import random

# --- Data Templates ---
MONSTERS = {
    "sand_viper": {"name": "Sand Viper", "hp": 10, "attack": 4, "defense": 2, "gold": 7, "loot": "sand_viper_fang"},
    "roc": {"name": "Roc", "hp": 15, "attack": 5, "defense": 3, "gold": 12},
}

SHOPS = {
    "gear_stall": {
        "name": "Desert Gear Supply",
        "inventory": ["iron_sword", "ring_of_protection"]
    },
    "oasis_drinks": {
        "name": "Oasis Refreshments",
        "inventory": [] # Can be populated with consumables later
    }
}

NPCS = {
    "mobashi_elder": {
        "name": "Mobashi Elder",
        "dialogue": "Welcome, traveler. Our lands are harsh, but our people are strong. Beware the great Rocs that hunt in the dunes."
    },
    "mobashi_hunter": {
        "name": "Mobashi Hunter",
        "dialogue": "The Sand Vipers are a plague. Bring me 10 of their fangs, and I will reward you."
    },
    "old_sailor": {
        "name": "Old Sailor",
        "dialogue": "The sea... it calls. I can feel it in my bones. An ancient evil stirs in the deep. If you are brave enough, seek the Sunken City. Take this, it may help you on your journey.",
        "quest": "call_of_the_deep",
        "item": "gillyweed_potion"
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
            desc = f"You are in a {adj} {noun} of the desert. {detail}"

            rooms[room_id] = {"description": desc, "exits": {}}

            # Connect to neighbors
            if x > 0: rooms[room_id]["exits"]["west"] = f"{prefix}_{x-1}_{y}"
            if x < width - 1: rooms[room_id]["exits"]["east"] = f"{prefix}_{x+1}_{y}"
            if y > 0: rooms[room_id]["exits"]["north"] = f"{prefix}_{x}_{y-1}"
            if y < height - 1: rooms[room_id]["exits"]["south"] = f"{prefix}_{x}_{y+1}"

    return rooms

def generate_mobah():
    """Main function to generate the entire Mobah Desert."""
    all_rooms = {}

    # 1. Generate Zones (approx. 500 rooms total)
    main_desert = generate_zone(20, 20, "d", [["vast", "scorching", "windswept"], ["expanse", "dune sea"], ["The sun beats down relentlessly."]])
    market = generate_zone(5, 5, "m", [["bustling", "colorful"], ["market square", "oasis bazaar"], ["The smell of exotic spices fills the air."]])
    tribal_village = generate_zone(10, 10, "t", [["quiet", "sandstone"], ["village", "tribal ground"], ["The Mobashi people watch you silently."]])

    all_rooms.update(main_desert)
    all_rooms.update(market)
    all_rooms.update(tribal_village)

    # 2. Connect Zones
    main_desert["d_19_10"]["exits"]["east"] = "bailon_west_gate" # Connects back to Bailon (placeholder)
    main_desert["d_10_0"]["exits"]["north"] = "m_2_4" # Desert to Market
    market["m_2_4"]["exits"]["south"] = "d_10_0"
    main_desert["d_0_10"]["exits"]["west"] = "t_9_5" # Desert to Tribal Village
    tribal_village["t_9_5"]["exits"]["east"] = "d_0_10"

    # 3. Populate Zones
    # Shops and Inn in Market
    market["m_1_1"]["shop"] = SHOPS["gear_stall"]
    market["m_3_3"]["shop"] = SHOPS["oasis_drinks"]
    market["m_3_3"]["quest_object"] = "oasis_water"
    market["m_2_2"]["inn"] = {"cost": 15}
    market["m_4_4"]["npcs"] = {"sailor": NPCS["old_sailor"]}

    # Connect to Sunken City
    main_desert["d_10_19"]["exits"]["south"] = "area4_gateway"


    # NPCs in Tribal Village
    tribal_village["t_5_5"]["npcs"] = {"elder": NPCS["mobashi_elder"]}
    tribal_village["t_3_3"]["npcs"] = {"hunter": NPCS["mobashi_hunter"]}

    # Monsters in the Desert
    for room_id in main_desert:
        if random.random() < 0.1: main_desert[room_id]["monster"] = MONSTERS["sand_viper"].copy()
        elif random.random() < 0.05: main_desert[room_id]["monster"] = MONSTERS["roc"].copy()

    # Add final boss and amulet fragment
    main_desert["d_0_0"]["monster"] = {
        "name": "Giant Sand Wurm", "hp": 250, "attack": 20, "defense": 5, "gold": 500
    }
    main_desert["d_0_0"]["quest_object"] = "amulet_fragment_desert"

    # 4. Quests
    # Quest data can be expanded here. For now, the hunter's dialogue implies a quest.

    # 5. Final Assembly
    area_data = {
        "name": "The Mobah Desert",
        "description": "A vast and unforgiving desert, home to the hardy Mobashi tribes.",
        "start_room": "d_19_10", # The room connecting to Bailon
        "rooms": all_rooms,
        "quests": {
            "viper_hunt": {"name": "Viper Hunt", "description": "Hunt Sand Vipers for the Mobashi hunter."}
        }
    }
    return area_data

if __name__ == "__main__":
    mobah_data = generate_mobah()
    with open('mud/areas/area3.json', 'w') as f:
        json.dump(mobah_data, f, indent=2)
    print(f"Generated Mobah Desert with {len(mobah_data['rooms'])} rooms and saved to mud/areas/area3.json")
