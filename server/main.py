import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Pokedex API")

POKEAPI_BASE_URL = "https://pokeapi.co/api/v2"
SPRITE_BASE_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon"
CLEAR_SPRITE_BASE_URL = f"{SPRITE_BASE_URL}/versions/generation-v/black-white"

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


def pokeapi_get(path_or_url, params=None):
    url = path_or_url if path_or_url.startswith("http") else f"{POKEAPI_BASE_URL}{path_or_url}"

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="PokeAPI request failed") from error


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
        variety_data = pokeapi_get(variety["pokemon"]["url"])
        varieties.append(normalize_pokemon_row(variety_data))

    return sorted(varieties, key=sort_pokemon_rows)


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
        "results": sorted(pokemon_rows, key=sort_pokemon_rows),
    }