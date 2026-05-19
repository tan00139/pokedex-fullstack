import { useEffect, useState } from "react";
import "./App.css";

const poke_count = 20;

const statNames = [
  ["hp", "HP"],
  ["attack", "Atk"],
  ["defense", "Def"],
  ["specialAttack", "SpA"],
  ["specialDefense", "SpD"],
  ["speed", "Spe"],
];

function capitalizeType(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function PokedexEntry({ currentPokemon, loadingEntry, closePokedexEntry, pokedexEntry }) {
  const [currentTab, setCurrentTab] = useState("overview");

  if (!currentPokemon && !loadingEntry) {
    return null;
  }

  return (
    <div
      className="pokedex-overlay active"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closePokedexEntry();
        }
      }}
    >
      <article className="pokedex-entry">
        <button className="close-btn" type="button" onClick={closePokedexEntry} aria-label="Close">
          x
        </button>

        {loadingEntry ? (
          <p className="modal-loading">Loading entry...</p>
        ) : (
          <>
            <header className="entry-header">
              <div className="pokemon-image-wrapper">
                <img
                  src={currentPokemon.sprite}
                  alt={currentPokemon.name}
                  onError={(event) => {
                    event.currentTarget.src = currentPokemon.fallbackSprite;
                  }}
                />
              </div>

              <h2 className="pokemon-name">{currentPokemon.name}</h2>
              <p className="pokemon-number">
                #{String(currentPokemon.displayId).padStart(3, "0")}
              </p>
              <p>
                {currentPokemon.types.map((type) => (
                  <span className={`type-badge type-${type}`} key={type}>
                    {capitalizeType(type)}
                  </span>
                ))}
              </p>
            </header>

            <div className="entry-tabs">
              <button
                className={`tab-btn ${currentTab === "overview" ? "active" : ""}`}
                type="button"
                onClick={() => setCurrentTab("overview")}
              >
                Overview
              </button>
              <button
                className={`tab-btn ${currentTab === "moves" ? "active" : ""}`}
                type="button"
                onClick={() => setCurrentTab("moves")}
              >
                Moves
              </button>
            </div>

            {currentTab === "overview" ? (
              <section className="tab-panel active">
                <div className="overview-grid">
                  <div>
                    <h3>Abilities</h3>
                    {currentPokemon.abilities.map((ability) => (
                      <div className="ability-detail" key={ability.name}>
                        <strong className={ability.isHidden ? "hidden-ability" : ""}>
                          {ability.name}
                          {ability.isHidden ? " (Hidden)" : ""}
                        </strong>
                        <span>{ability.effect}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3>Profile</h3>
                    <p className="profile-list">
                      <span>Height: {currentPokemon.profile.heightMeters} m</span>
                      <span>Weight: {currentPokemon.profile.weightKg} kg</span>
                    </p>
                  </div>

                  <div className="base-stats-section">
                    <h3>Base Stats</h3>
                    <div className="stats-list">
                      {statNames.map(([statKey, statName]) => (
                        <div className="stat-row" key={statKey}>
                          <span>{statName}</span>
                          <div className="stat-bar">
                            <div
                              className={`stat-fill ${
                                currentPokemon.stats[statKey] >= 100 ? "high-stat" : "low-stat"
                              }`}
                              style={{
                                width: `${Math.min(currentPokemon.stats[statKey], 160) / 1.6}%`,
                              }}
                            />
                          </div>
                          <strong>{currentPokemon.stats[statKey]}</strong>
                        </div>
                      ))}
                      <div className="stat-total">BST {currentPokemon.stats.total}</div>
                    </div>
                  </div>

                  <div className="evolution-section">
                    <h3>Evolution Line</h3>
                    <div className="evolution-list">
                      {currentPokemon.evolution.length > 1 ? (
                        <div className="evolution-chain-line">
                          {currentPokemon.evolution.map((item, index) => {
                            if (item.kind === "method") {
                              return (
                                <span
                                  className="evolution-arrow"
                                  key={`${item.method}-${index}`}
                                >
                                  <strong>{item.method}</strong>
                                  <span>-&gt;</span>
                                </span>
                              );
                            }

                            return (
                              <button
                                className="evolution-item evolution-button"
                                key={`${item.id}-${index}`}
                                type="button"
                                onClick={() => pokedexEntry(item.id)}
                              >
                                <img
                                  src={item.sprite}
                                  alt=""
                                  onError={(event) => {
                                    event.currentTarget.src = item.fallbackSprite;
                                  }}
                                />
                                <span
                                  className={`evolution-name ${
                                    item.name.length > 8 ? "long-evolution-name" : ""
                                  } ${
                                    item.name.length > 11 ? "very-long-evolution-name" : ""
                                  }`}
                                >
                                  {item.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="evolution-note">This Pokemon does not evolve.</p>
                      )}

                      {currentPokemon.alternateForms.length > 0 && (
                        <>
                          <h4>Alternate Forms</h4>
                          <div className="alternate-form-list">
                            {currentPokemon.alternateForms.map((form) => {
                              let formName = form.name;

                              if (form.name.startsWith(form.speciesName)) {
                                formName = form.name.replace(form.speciesName, "").trim();
                              }

                              return (
                                <button
                                  className="evolution-item alternate-form-item evolution-button"
                                  key={form.id}
                                  type="button"
                                  onClick={() => pokedexEntry(form.id)}
                                >
                                  <img
                                    src={form.sprite}
                                    alt=""
                                    onError={(event) => {
                                      event.currentTarget.src = form.fallbackSprite;
                                    }}
                                  />
                                  <span className="alternate-form-name">
                                    {formName && formName !== form.name ? (
                                      <>
                                        <span
                                          className={`evolution-name ${
                                            form.speciesName.length > 8
                                              ? "long-evolution-name"
                                              : ""
                                          } ${
                                            form.speciesName.length > 11
                                              ? "very-long-evolution-name"
                                              : ""
                                          }`}
                                        >
                                          {form.speciesName}
                                        </span>
                                        <span
                                          className={`evolution-name ${
                                            formName.length > 8 ? "long-evolution-name" : ""
                                          } ${
                                            formName.length > 11
                                              ? "very-long-evolution-name"
                                              : ""
                                          }`}
                                        >
                                          {formName}
                                        </span>
                                      </>
                                    ) : (
                                      form.name
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="weakness-section">
                    <h3>Type Weaknesses</h3>
                    <div className="weakness-list">
                      {currentPokemon.weaknesses.map((weakness) => (
                        <span className="weakness-item" key={weakness.type}>
                          <span className={`type-badge type-${weakness.type}`}>
                            {capitalizeType(weakness.type)}
                          </span>{" "}
                          {weakness.multiplier}x
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="tab-panel active">
                <div className="moves-grid">
                  <div>
                    <h3>Level Up</h3>
                    <div className={`move-list ${currentPokemon.moves.levelUp.length ? "" : "empty-list"}`}>
                      {currentPokemon.moves.levelUp.length ? (
                        currentPokemon.moves.levelUp.map((move) => (
                          <div className="move-item" key={`${move.name}-${move.level}`}>
                            Lv. {move.level} - {move.name}
                          </div>
                        ))
                      ) : (
                        "No moves found."
                      )}
                    </div>
                  </div>

                  <div>
                    <h3>TM/HM</h3>
                    <div className={`move-list ${currentPokemon.moves.machine.length ? "" : "empty-list"}`}>
                      {currentPokemon.moves.machine.length ? (
                        currentPokemon.moves.machine.map((move) => (
                          <div className="move-item" key={`${move.machineName}-${move.name}`}>
                            {move.machineName ? `${move.machineName} - ` : ""}
                            {move.name}
                          </div>
                        ))
                      ) : (
                        "No moves found."
                      )}
                    </div>
                  </div>

                  <div>
                    <h3>Tutor</h3>
                    <div className={`move-list ${currentPokemon.moves.tutor.length ? "" : "empty-list"}`}>
                      {currentPokemon.moves.tutor.length ? (
                        currentPokemon.moves.tutor.map((move) => (
                          <div className="move-item" key={move.name}>
                            {move.name}
                          </div>
                        ))
                      ) : (
                        "No moves found."
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </article>
    </div>
  );
}

function App() {
  const [loadedPokemon, setLoadedPokemon] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [pokemonOffset, setPokemonOffset] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [statusMessage, setStatusMessage] = useState("Loading Pokemon...");
  const [loadingPokemon, setLoadingPokemon] = useState(false);
  const [currentPokemon, setCurrentPokemon] = useState(null);
  const [loadingEntry, setLoadingEntry] = useState(false);

  const shownPokemon = searchText.trim() ? searchResults : loadedPokemon;

  useEffect(() => {
    const currentSearch = searchText.trim();
    const controller = new AbortController();

    if (!currentSearch) {
      return undefined;
    }

    const searchDelay = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/pokemon/search?q=${encodeURIComponent(currentSearch)}`,
          { signal: controller.signal },
        );
        const data = await response.json();

        setSearchResults(data.results);

        if (data.results.length === 0) {
          setStatusMessage("No Pokemon match your search.");
        } else {
          setStatusMessage("");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setStatusMessage("Search failed. Please try again.");
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(searchDelay);
    };
  }, [searchText]);

  async function getPokemon(nextOffset) {
    const response = await fetch(`/api/pokemon?offset=${nextOffset}&limit=${poke_count}`);
    const data = await response.json();
    return data.results;
  }

  async function getPokemonDetails(pokemonId) {
    const response = await fetch(`/api/pokemon/${pokemonId}`);
    const data = await response.json();
    return data;
  }

  async function loadNext20Pokemon(nextOffset = pokemonOffset) {
    setLoadingPokemon(true);
    setStatusMessage("Loading Pokemon...");

    try {
      const pokemonList = await getPokemon(nextOffset);

      setLoadedPokemon((oldList) => {
        const newList = [...oldList];

        pokemonList.forEach((pokemon) => {
          const alreadyAdded = newList.some((item) => item.id === pokemon.id);

          if (!alreadyAdded) {
            newList.push(pokemon);
          }
        });

        newList.sort((first, second) => {
          if (first.displayId !== second.displayId) {
            return first.displayId - second.displayId;
          }

          if (first.isDefault !== second.isDefault) {
            return first.isDefault ? -1 : 1;
          }

          return first.id - second.id;
        });

        return newList;
      });

      setPokemonOffset(nextOffset + poke_count);
      setStatusMessage("");
    } catch {
      setStatusMessage("Pokemon could not be loaded. Please try again.");
    }

    setLoadingPokemon(false);
  }

  function startPokedex() {
    loadNext20Pokemon(0);
  }

  useEffect(() => {
    Promise.resolve().then(startPokedex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchChange(event) {
    const newSearchText = event.target.value;
    setSearchText(newSearchText);

    if (newSearchText.trim()) {
      setStatusMessage("Searching Pokemon...");
    } else {
      setSearchResults([]);
      setStatusMessage("");
    }
  }

  async function pokedexEntry(pokemonId) {
    setCurrentPokemon(null);
    setLoadingEntry(true);

    try {
      const pokemonInfo = await getPokemonDetails(pokemonId);
      setCurrentPokemon(pokemonInfo);
    } catch {
      setStatusMessage("Pokemon entry could not be loaded.");
    }

    setLoadingEntry(false);
  }

  return (
    <main>
      <header className="header">
        <h1>Pokedex</h1>
        <p>Search Pokemon, check stats, and view learnsets.</p>
      </header>

      <section className="controls">
        <div className="search-wrapper">
          <label htmlFor="search-input">Search Pokemon</label>
          <input
            id="search-input"
            type="search"
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Enter Pokemon name..."
          />
        </div>
      </section>

      <p className="status-message">{statusMessage}</p>

      <section className="dex-table-wrapper">
        <table className="dex-table">
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
            {shownPokemon.map((pokemon) => (
              <tr
                className={`pokemon-row row-${pokemon.types[0]}`}
                key={pokemon.id}
                onClick={() => pokedexEntry(pokemon.id)}
              >
                <td className="dex-number-cell">{pokemon.displayId}</td>
                <td className="dex-sprite-cell">
                  <img
                    className="table-sprite"
                    src={pokemon.sprite}
                    alt={pokemon.name}
                    onError={(event) => {
                      event.currentTarget.src = pokemon.fallbackSprite;
                    }}
                  />
                </td>
                <td className="pokemon-name-cell">{pokemon.name}</td>
                <td className="pokemon-type-cell">
                  {pokemon.types.map((type) => (
                    <span className={`type-badge type-${type}`} key={type}>
                      {capitalizeType(type)}
                    </span>
                  ))}
                </td>
                <td className="ability-cell">
                  <div className="ability-list">
                    {pokemon.abilities.map((ability) => (
                      <span
                        className={ability.isHidden ? "hidden-ability" : ""}
                        key={ability.name}
                      >
                        {ability.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="desktop-stat-cell">{pokemon.stats.hp}</td>
                <td className="desktop-stat-cell">{pokemon.stats.attack}</td>
                <td className="desktop-stat-cell">{pokemon.stats.defense}</td>
                <td className="desktop-stat-cell">{pokemon.stats.specialAttack}</td>
                <td className="desktop-stat-cell">{pokemon.stats.specialDefense}</td>
                <td className="desktop-stat-cell">{pokemon.stats.speed}</td>
                <td className="desktop-stat-cell">{pokemon.stats.total}</td>
                <td className="mobile-stats-cell">
                  {statNames.map(([statKey, statName]) => (
                    <span className="mobile-stat" key={statKey}>
                      <span>{statName}</span>
                      <strong>{pokemon.stats[statKey]}</strong>
                    </span>
                  ))}
                  <span className="mobile-stat">
                    <span>BST</span>
                    <strong>{pokemon.stats.total}</strong>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {!searchText.trim() && (
        <div className="load-more-btn">
          <button
            className="btn"
            type="button"
            onClick={() => loadNext20Pokemon()}
            disabled={loadingPokemon}
          >
            {loadingPokemon ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      <PokedexEntry
        key={currentPokemon?.id ?? "loading"}
        currentPokemon={currentPokemon}
        loadingEntry={loadingEntry}
        pokedexEntry={pokedexEntry}
        closePokedexEntry={() => {
          setCurrentPokemon(null);
          setLoadingEntry(false);
        }}
      />
    </main>
  );
}

export default App;
