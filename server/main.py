from functools import lru_cache

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Pokedex API")

POKEAPI_BASE_URL = "https://pokeapi.co/api/v2"
SPRITE_BASE_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon"
CLEAR_SPRITE_BASE_URL = f"{SPRITE_BASE_URL}/versions/generation-v/black-white"
POKEMON_PAGE_SIZE = 20
TYPE_NAMES = [
    "normal",
    "fire",
    "water",
    "electric",
    "grass",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
]
HM_MOVES = {
    "cut": "hm01",
    "fly": "hm02",
    "surf": "hm03",
    "strength": "hm04",
    "flash": "hm05",
    "rock-smash": "hm06",
    "waterfall": "hm07",
    "dive": "hm08",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"message": "Pokedex API is running"}


@lru_cache(maxsize=2048)
def cached_pokeapi_get(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="PokeAPI request failed") from error


def pokeapi_get(path_or_url, params=None):
    url = path_or_url if path_or_url.startswith("http") else f"{POKEAPI_BASE_URL}{path_or_url}"

    if params:
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as error:
            raise HTTPException(status_code=502, detail="PokeAPI request failed") from error

    return cached_pokeapi_get(url)


def parse_id_from_url(url):
    return int(url.rstrip("/").split("/")[-1])


def format_name(name):
    return " ".join(word.capitalize() for word in name.split("-"))


def normalize_stats(stats):
    stat_values = {stat["stat"]["name"]: stat["base_stat"] for stat in stats}

    return {
        "hp": stat_values.get("hp", 0),
        "attack": stat_values.get("attack", 0),
        "defense": stat_values.get("defense", 0),
        "specialAttack": stat_values.get("special-attack", 0),
        "specialDefense": stat_values.get("special-defense", 0),
        "speed": stat_values.get("speed", 0),
        "total": sum(stat_values.values()),
    }


def normalize_pokemon_row(pokemon):
    display_id = parse_id_from_url(pokemon["species"]["url"])

    return {
        "id": pokemon["id"],
        "displayId": display_id,
        "name": format_name(pokemon["name"]),
        "rawName": pokemon["name"],
        "sprite": f"{CLEAR_SPRITE_BASE_URL}/{pokemon['id']}.png",
        "fallbackSprite": f"{SPRITE_BASE_URL}/{pokemon['id']}.png",
        "types": [slot["type"]["name"] for slot in pokemon["types"]],
        "abilities": [
            {
                "name": format_name(ability["ability"]["name"]),
                "isHidden": ability["is_hidden"],
            }
            for ability in pokemon["abilities"]
        ],
        "stats": normalize_stats(pokemon["stats"]),
        "isDefault": pokemon["is_default"],
    }


def is_totem_form(pokemon_name):
    return "totem" in pokemon_name


def unique_pokemon_rows(rows):
    by_id = {row["id"]: row for row in rows}
    return sorted(by_id.values(), key=sort_pokemon_rows)


def sort_pokemon_rows(pokemon):
    return (
        pokemon["displayId"],
        0 if pokemon["isDefault"] else 1,
        pokemon["id"],
    )


def get_pokemon_varieties(pokemon):
    species = pokeapi_get(pokemon["species"]["url"])
    varieties = []

    for variety in species["varieties"]:
        if is_totem_form(variety["pokemon"]["name"]):
            continue

        variety_data = pokeapi_get(variety["pokemon"]["url"])
        varieties.append(normalize_pokemon_row(variety_data))

    return sorted(varieties, key=sort_pokemon_rows)


def get_english_ability_effect(ability):
    short_effect = next(
        (
            effect["short_effect"]
            for effect in ability.get("effect_entries", [])
            if effect["language"]["name"] == "en"
        ),
        "",
    )
    if short_effect:
        return short_effect

    flavor_text = next(
        (
            entry["flavor_text"]
            for entry in ability.get("flavor_text_entries", [])
            if entry["language"]["name"] == "en"
        ),
        "",
    )
    return flavor_text.replace("\f", " ")


def get_evolution_text(evolution_details):
    if not evolution_details:
        return ""

    detail = evolution_details[0]
    if detail.get("min_level"):
        return f"Lv. {detail['min_level']}"
    if detail.get("item"):
        return format_name(detail["item"]["name"])
    if detail.get("trigger"):
        return format_name(detail["trigger"]["name"])

    return ""


def collect_evolution_parts(chain, parts):
    if not parts:
        species_id = parse_id_from_url(chain["species"]["url"])
        parts.append(
            {
                "kind": "species",
                "id": species_id,
                "name": format_name(chain["species"]["name"]),
                "sprite": f"{CLEAR_SPRITE_BASE_URL}/{species_id}.png",
                "fallbackSprite": f"{SPRITE_BASE_URL}/{species_id}.png",
            }
        )

    for next_evolution in chain["evolves_to"]:
        parts.append(
            {
                "kind": "method",
                "method": get_evolution_text(next_evolution["evolution_details"]),
            }
        )
        species_id = parse_id_from_url(next_evolution["species"]["url"])
        parts.append(
            {
                "kind": "species",
                "id": species_id,
                "name": format_name(next_evolution["species"]["name"]),
                "sprite": f"{CLEAR_SPRITE_BASE_URL}/{species_id}.png",
                "fallbackSprite": f"{SPRITE_BASE_URL}/{species_id}.png",
            }
        )
        collect_evolution_parts(next_evolution, parts)


def update_damage_map(damage_map, type_list, amount):
    for type_object in type_list:
        damage_map[type_object["name"]] *= amount


def get_weaknesses(pokemon):
    damage_map = {type_name: 1 for type_name in TYPE_NAMES}

    for type_name in [slot["type"]["name"] for slot in pokemon["types"]]:
        type_data = pokeapi_get(f"/type/{type_name}")
        relations = type_data["damage_relations"]
        update_damage_map(damage_map, relations["double_damage_from"], 2)
        update_damage_map(damage_map, relations["half_damage_from"], 0.5)
        update_damage_map(damage_map, relations["no_damage_from"], 0)

    return [
        {"type": type_name, "multiplier": damage_map[type_name]}
        for type_name in TYPE_NAMES
        if damage_map[type_name] != 1
    ]


def get_move_level(move_object, method_name):
    detail = next(
        (
            version_detail
            for version_detail in move_object["version_group_details"]
            if version_detail["move_learn_method"]["name"] == method_name
        ),
        None,
    )
    return detail["level_learned_at"] if detail else 0


def move_has_method(move_object, method_name):
    return any(
        version_detail["move_learn_method"]["name"] == method_name
        for version_detail in move_object["version_group_details"]
    )


def normalize_method_moves(pokemon, method_name):
    move_list = [
        move_object for move_object in pokemon["moves"] if move_has_method(move_object, method_name)
    ]

    if method_name == "level-up":
        move_list.sort(key=lambda move_object: get_move_level(move_object, method_name))

    return [
        {
            "name": format_name(move_object["move"]["name"]),
            "level": get_move_level(move_object, method_name) if method_name == "level-up" else None,
        }
        for move_object in move_list[:40]
    ]


def get_machine_info(move_info):
    if not move_info["machines"]:
        return None

    return move_info["machines"][-1]


def get_machine_number(machine_name):
    digits = "".join(character for character in machine_name if character.isdigit())
    return int(digits) if digits else 0


def get_machine_type_order(machine_name):
    if machine_name.startswith("hm"):
        return 2
    if machine_name.startswith("tm"):
        return 1
    return 3


def normalize_machine_moves(pokemon):
    move_list = [
        move_object for move_object in pokemon["moves"] if move_has_method(move_object, "machine")
    ][:40]
    machine_moves = []

    for move_object in move_list:
        machine_name = ""
        move_info = pokeapi_get(move_object["move"]["url"])
        machine_info = get_machine_info(move_info)

        if machine_info:
            machine_data = pokeapi_get(machine_info["machine"]["url"])
            machine_name = HM_MOVES.get(move_object["move"]["name"], machine_data["item"]["name"])

        machine_moves.append(
            {
                "name": format_name(move_object["move"]["name"]),
                "machineName": machine_name.upper(),
                "sortType": get_machine_type_order(machine_name),
                "sortNumber": get_machine_number(machine_name),
            }
        )

    return sorted(machine_moves, key=lambda move: (move["sortType"], move["sortNumber"], move["name"]))


def normalize_alternate_form(pokemon):
    row = normalize_pokemon_row(pokemon)
    return {
        "id": row["id"],
        "name": row["name"],
        "speciesName": format_name(pokemon["species"]["name"]),
        "sprite": row["sprite"],
        "fallbackSprite": row["fallbackSprite"],
    }


@app.get("/api/pokemon")
def get_pokemon(offset: int = 0, limit: int = 20):
    data = pokeapi_get("/pokemon", params={"offset": offset, "limit": limit})
    pokemon_rows = []

    for pokemon in data["results"]:
        pokemon_data = pokeapi_get(pokemon["url"])
        pokemon_rows.extend(get_pokemon_varieties(pokemon_data))

    return {
        "count": data["count"],
        "next": data["next"],
        "previous": data["previous"],
        "results": unique_pokemon_rows(pokemon_rows),
    }


@app.get("/api/pokemon/search")
def search_pokemon(q: str, limit: int = POKEMON_PAGE_SIZE):
    search_text = q.strip().lower()
    if not search_text:
        return {"results": []}

    pokemon_list = pokeapi_get("/pokemon", params={"offset": 0, "limit": 100000})
    matching_pokemon = [
        pokemon
        for pokemon in pokemon_list["results"]
        if search_text in pokemon["name"] or str(parse_id_from_url(pokemon["url"])) == search_text
    ][:limit]
    pokemon_rows = []

    for pokemon in matching_pokemon:
        pokemon_data = pokeapi_get(pokemon["url"])
        pokemon_rows.extend(get_pokemon_varieties(pokemon_data))

    filtered_rows = [
        pokemon
        for pokemon in unique_pokemon_rows(pokemon_rows)
        if search_text in pokemon["rawName"]
        or search_text in pokemon["name"].lower()
        or search_text in str(pokemon["displayId"])
    ]
    return {"results": filtered_rows}


@app.get("/api/pokemon/{pokemon_id}")
def get_pokemon_detail(pokemon_id: int):
    pokemon = pokeapi_get(f"/pokemon/{pokemon_id}")
    species = pokeapi_get(pokemon["species"]["url"])
    row = normalize_pokemon_row(pokemon)
    evolution_data = pokeapi_get(species["evolution_chain"]["url"])
    evolution_parts = []
    collect_evolution_parts(evolution_data["chain"], evolution_parts)

    ability_details = []
    for ability in pokemon["abilities"]:
        ability_data = pokeapi_get(ability["ability"]["url"])
        ability_details.append(
            {
                "name": format_name(ability["ability"]["name"]),
                "isHidden": ability["is_hidden"],
                "effect": get_english_ability_effect(ability_data),
            }
        )

    alternate_forms = []
    for variety in species["varieties"]:
        if not variety["is_default"] and not is_totem_form(variety["pokemon"]["name"]):
            alternate_forms.append(normalize_alternate_form(pokeapi_get(variety["pokemon"]["url"])))

    return {
        **row,
        "abilities": ability_details,
        "profile": {
            "heightMeters": pokemon["height"] / 10,
            "weightKg": pokemon["weight"] / 10,
        },
        "evolution": evolution_parts,
        "alternateForms": alternate_forms,
        "weaknesses": get_weaknesses(pokemon),
        "moves": {
            "levelUp": normalize_method_moves(pokemon, "level-up"),
            "machine": normalize_machine_moves(pokemon),
            "tutor": normalize_method_moves(pokemon, "tutor"),
        },
    }
