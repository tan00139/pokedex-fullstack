import { useEffect, useState } from "react";

function App() {
  const [pokemon, setPokemon] = useState([]);
  const [message, setMessage] = useState("Loading Pokemon...");

  useEffect(() => {
    fetch("/api/pokemon?offset=0&limit=20")
      .then((response) => response.json())
      .then((data) => {
        setPokemon(data.results);
        setMessage("");
      })
      .catch(() => {
        setMessage("Could not load Pokemon from the backend.");
      });
  }, []);

  return (
    <main>
      <h1>Pokedex</h1>

      {message && <p>{message}</p>}

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Sprite</th>
            <th>Name</th>
            <th>Type</th>
            <th>Abilities</th>
            <th>HP</th>
            <th>Atk</th>
            <th>Def</th>
            <th>SpA</th>
            <th>SpD</th>
            <th>Spe</th>
            <th>BST</th>
          </tr>
        </thead>
        <tbody>
          {pokemon.map((pokemonItem) => (
            <tr key={pokemonItem.id}>
              <td>{pokemonItem.displayId}</td>
              <td>
                <img
                  src={pokemonItem.sprite}
                  onError={(event) => {
                    event.currentTarget.src = pokemonItem.fallbackSprite;
                  }}
                  alt={pokemonItem.name}
                  width="72"
                  height="72"
                />
              </td>
              <td>{pokemonItem.name}</td>
              <td>{pokemonItem.types.join(", ")}</td>
              <td>
                {pokemonItem.abilities.map((ability) => (
                  <div key={ability.name}>
                    {ability.name}
                    {ability.isHidden ? " (Hidden)" : ""}
                  </div>
                ))}
              </td>
              <td>{pokemonItem.stats.hp}</td>
              <td>{pokemonItem.stats.attack}</td>
              <td>{pokemonItem.stats.defense}</td>
              <td>{pokemonItem.stats.specialAttack}</td>
              <td>{pokemonItem.stats.specialDefense}</td>
              <td>{pokemonItem.stats.speed}</td>
              <td>{pokemonItem.stats.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export default App;