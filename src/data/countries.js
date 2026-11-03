// Stub country catalog + ISO2 map for optional leaderboard locale.
// Autocomplete pattern mirrors vegetable_survey Q7.

function item(id, name, iso2, aliases = []) {
  return { id, name, iso2, aliases };
}

export const countries = [
  item("poland", "Poland", "PL", ["polska", "rp"]),
  item("germany", "Germany", "DE", ["deutschland", "ger"]),
  item("united_states", "United States", "US", ["usa", "america", "united states of america"]),
  item("united_kingdom", "United Kingdom", "GB", ["uk", "britain", "great britain", "england"]),
  item("france", "France", "FR", []),
  item("italy", "Italy", "IT", ["italia"]),
  item("spain", "Spain", "ES", ["espana", "españa"]),
  item("netherlands", "Netherlands", "NL", ["holland"]),
  item("belgium", "Belgium", "BE", []),
  item("austria", "Austria", "AT", ["oesterreich", "österreich"]),
  item("switzerland", "Switzerland", "CH", ["schweiz"]),
  item("czech_republic", "Czechia", "CZ", ["czech republic", "czechia"]),
  item("slovakia", "Slovakia", "SK", []),
  item("hungary", "Hungary", "HU", []),
  item("sweden", "Sweden", "SE", []),
  item("norway", "Norway", "NO", []),
  item("denmark", "Denmark", "DK", []),
  item("finland", "Finland", "FI", []),
  item("ireland", "Ireland", "IE", []),
  item("portugal", "Portugal", "PT", []),
  item("canada", "Canada", "CA", []),
  item("australia", "Australia", "AU", []),
  item("new_zealand", "New Zealand", "NZ", []),
  item("japan", "Japan", "JP", []),
  item("south_korea", "South Korea", "KR", ["korea", "republic of korea"]),
  item("china", "China", "CN", ["prc"]),
  item("taiwan", "Taiwan", "TW", []),
  item("hong_kong", "Hong Kong", "HK", []),
  item("brazil", "Brazil", "BR", ["brasil"]),
  item("mexico", "Mexico", "MX", []),
  item("argentina", "Argentina", "AR", []),
  item("chile", "Chile", "CL", []),
  item("india", "India", "IN", []),
  item("ukraine", "Ukraine", "UA", []),
  item("russia", "Russia", "RU", []),
  item("turkey", "Turkey", "TR", ["turkiye", "türkiye"]),
  item("israel", "Israel", "IL", []),
  item("south_africa", "South Africa", "ZA", []),
];

const byId = Object.fromEntries(countries.map((entry) => [entry.id, entry]));

export function iso2ForCountry(id) {
  return byId[id]?.iso2 ?? null;
}

export function countryByIso2(code) {
  const needle = String(code || "").toUpperCase();
  return countries.find((entry) => entry.iso2 === needle) ?? null;
}

function normalizeQuery(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function findCanonicalCountry(query) {
  const q = normalizeQuery(query);
  if (!q) return null;
  const exact = countries.filter((entry) => normalizeQuery(entry.name) === q);
  if (exact.length === 1) return exact[0].id;
  for (const entry of countries) {
    if (entry.aliases.some((alias) => normalizeQuery(alias) === q)) return entry.id;
  }
  return null;
}

export function getCountrySuggestions(query, limit = 6) {
  const q = normalizeQuery(query);
  if (q.length < 1) return [];
  const scored = [];
  for (const entry of countries) {
    const name = normalizeQuery(entry.name);
    const aliases = entry.aliases.map(normalizeQuery);
    const namePrefix = name.startsWith(q);
    const aliasPrefix = aliases.some((alias) => alias.startsWith(q));
    const nameContains = !namePrefix && name.includes(q);
    const aliasContains = !aliasPrefix && aliases.some((alias) => alias.includes(q));
    if (!namePrefix && !aliasPrefix && !nameContains && !aliasContains) continue;
    const rank = namePrefix ? 0 : aliasPrefix ? 1 : nameContains ? 2 : 3;
    scored.push({ entry, rank, length: name.length });
  }
  scored.sort((a, b) => a.rank - b.rank || a.length - b.length || a.entry.name.localeCompare(b.entry.name));
  return scored.slice(0, limit).map((item) => item.entry);
}
