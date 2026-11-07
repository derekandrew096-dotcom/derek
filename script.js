const matchups = [
  {
    id: "football-ravens-wolves",
    sport: "football",
    league: "AMERICAN FOOTBALL · DEMO",
    kickoff: "SAMPLE FIXTURE",
    away: { name: "Baltimore Ravens", abbreviation: "BAL", side: "AWAY", scored: 25.2, allowed: 18.4 },
    home: { name: "Chicago Wolves", abbreviation: "CHI", side: "HOME", scored: 22.8, allowed: 21.3 },
  },
  {
    id: "football-hawks-stallions",
    sport: "football",
    league: "AMERICAN FOOTBALL · DEMO",
    kickoff: "SAMPLE FIXTURE",
    away: { name: "Portland Hawks", abbreviation: "PDX", side: "AWAY", scored: 20.6, allowed: 23.1 },
    home: { name: "Austin Stallions", abbreviation: "AUS", side: "HOME", scored: 27.1, allowed: 19.8 },
  },
  {
    id: "soccer-london-madrid",
    sport: "soccer",
    league: "SOCCER · DEMO",
    kickoff: "SAMPLE FIXTURE",
    away: { name: "London Athletic", abbreviation: "LON", side: "AWAY", scored: 1.5, allowed: 1.2 },
    home: { name: "Madrid Union", abbreviation: "MAD", side: "HOME", scored: 1.9, allowed: 0.9 },
  },
  {
    id: "soccer-harbor-mountain",
    sport: "soccer",
    league: "SOCCER · DEMO",
    kickoff: "SAMPLE FIXTURE",
    away: { name: "Harbor City", abbreviation: "HBC", side: "AWAY", scored: 1.7, allowed: 1.4 },
    home: { name: "Mountain Rovers", abbreviation: "MTR", side: "HOME", scored: 1.4, allowed: 1.1 },
  },
];

const sportTabs = [...document.querySelectorAll(".sport-tab")];
const matchupList = document.querySelector("#matchup-list");
const resultsSummary = document.querySelector("#results-summary");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#matchup-search");
const savedToggle = document.querySelector("#saved-toggle");
const savedCount = document.querySelector("#saved-count");
const clearFilters = document.querySelector("#clear-filters");
const analystForm = document.querySelector("#analyst-form");
const analystSport = document.querySelector("#analyst-sport");
const analystResult = document.querySelector("#analyst-result");
const analystResultCard = document.querySelector("#analyst-result-card");
let analyzedMatchup = null;

let activeSport = "all";
let showSavedOnly = false;
const savedMatchups = new Set();

function americanOdds(probability) {
  if (probability <= 0 || probability >= 1) return "—";
  const odds = probability >= 0.5
    ? -Math.round((probability / (1 - probability)) * 100)
    : Math.round(((1 - probability) / probability) * 100);
  return odds > 0 ? `+${odds}` : `−${Math.abs(odds)}`;
}

function decimalOdds(probability) {
  return probability > 0 ? (1 / probability).toFixed(2) : "—";
}

function logistic(value) {
  return 1 / (1 + Math.exp(-value));
}

function footballEstimate(matchup) {
  const awayPoints = (matchup.away.scored + matchup.home.allowed) / 2;
  const homePoints = (matchup.home.scored + matchup.away.allowed) / 2 + 1.5;
  const homeWin = logistic((homePoints - awayPoints) / 7.5);
  return {
    type: "football",
    awayPoints,
    homePoints,
    away: 1 - homeWin,
    home: homeWin,
  };
}

function poissonProbability(goals, expected) {
  let probability = Math.exp(-expected);
  for (let index = 1; index <= goals; index += 1) {
    probability *= expected / index;
  }
  return probability;
}

function soccerEstimate(matchup) {
  const homeExpected = (matchup.home.scored + matchup.away.allowed) / 2 * 1.12;
  const awayExpected = (matchup.away.scored + matchup.home.allowed) / 2;
  let home = 0;
  let draw = 0;
  let away = 0;

  for (let homeGoals = 0; homeGoals <= 10; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= 10; awayGoals += 1) {
      const scoreProbability = poissonProbability(homeGoals, homeExpected)
        * poissonProbability(awayGoals, awayExpected);
      if (homeGoals > awayGoals) home += scoreProbability;
      else if (homeGoals === awayGoals) draw += scoreProbability;
      else away += scoreProbability;
    }
  }

  const total = home + draw + away;
  return {
    type: "soccer",
    homeExpected,
    awayExpected,
    away: away / total,
    draw: draw / total,
    home: home / total,
  };
}

function estimateMatch(matchup) {
  return matchup.sport === "soccer" ? soccerEstimate(matchup) : footballEstimate(matchup);
}

function percent(probability) {
  return `${(probability * 100).toFixed(1)}%`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderTeam(team, metricLabel) {
  return `
    <div class="team">
      <span class="team__monogram" aria-hidden="true">${escapeHTML(team.abbreviation)}</span>
      <span class="team__name">${escapeHTML(team.name)}</span>
      <span class="team__side">${escapeHTML(team.side)}</span>
      <span class="team__stat">${team.scored.toFixed(1)} ${metricLabel} scored · ${team.allowed.toFixed(1)} allowed</span>
    </div>`;
}

function renderOutcome(label, probability, side) {
  return `
    <div class="outcome">
      <div class="outcome__heading"><span>${label}</span><strong>${percent(probability)}</strong></div>
      <div class="outcome__track"><span class="outcome__fill outcome__fill--${side}" style="width:${(probability * 100).toFixed(2)}%"></span></div>
      <div class="outcome__odds"><span>Model fair odds</span><strong>${americanOdds(probability)} <span class="decimal-odds">(${decimalOdds(probability)})</span></strong></div>
    </div>`;
}

function renderMatchup(matchup, custom = false) {
  const estimate = estimateMatch(matchup);
  const isSaved = savedMatchups.has(matchup.id);
  const metricLabel = matchup.sport === "soccer" ? "goals / game" : "points / game";
  const prediction = matchup.sport === "soccer"
    ? `<div class="projection">EXPECTED GOALS <strong>${escapeHTML(matchup.home.abbreviation)} ${estimate.homeExpected.toFixed(2)} — ${estimate.awayExpected.toFixed(2)} ${escapeHTML(matchup.away.abbreviation)}</strong></div>`
    : `<div class="projection">ESTIMATED POINTS <strong>${escapeHTML(matchup.home.abbreviation)} ${Math.round(estimate.homePoints)} — ${Math.round(estimate.awayPoints)} ${escapeHTML(matchup.away.abbreviation)}</strong></div>`;
  const outcomes = matchup.sport === "soccer"
    ? `${renderOutcome(`${matchup.home.abbreviation} win`, estimate.home, "home")}${renderOutcome("Draw", estimate.draw, "draw")}${renderOutcome(`${matchup.away.abbreviation} win`, estimate.away, "away")}`
    : `${renderOutcome(`${matchup.home.abbreviation} win`, estimate.home, "home")}${renderOutcome(`${matchup.away.abbreviation} win`, estimate.away, "away")}`;
  const modelNote = matchup.sport === "soccer"
    ? "Independent Poisson goals · attack / opponent-concession averages · illustrative home factor"
    : "Scoring / opponent-concession averages · 1.5-point home adjustment · logistic margin curve";

  return `
    <article class="match-card match-card--${matchup.sport}">
      <div class="match-card__top">
        <div class="match-card__meta">
          <span class="match-card__sport">${escapeHTML(matchup.league)}</span>
          <span class="match-card__dot"></span>
          <span>${escapeHTML(matchup.kickoff)}</span>
          <span class="match-card__dot"></span>
          <span class="sample-tag">SYNTHETIC STATS</span>
        </div>
        ${custom ? "" : `<button class="favorite-button${isSaved ? " is-saved" : ""}" type="button" data-save-id="${escapeHTML(matchup.id)}" aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove" : "Save"} ${escapeHTML(matchup.away.name)} versus ${escapeHTML(matchup.home.name)}">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 3.5h9a.8.8 0 0 1 .8.8v12.2L10 13.2l-5.3 3.3V4.3a.8.8 0 0 1 .8-.8Z" /></svg>
          ${isSaved ? "Saved" : "Save"}
        </button>`}
      </div>
      <div class="match-card__body">
        <div class="teams">${renderTeam(matchup.away, metricLabel)}${renderTeam(matchup.home, metricLabel)}</div>
        <div class="analysis">
          ${prediction}
          <div class="outcomes">${outcomes}</div>
          <div class="model-note">${modelNote}</div>
        </div>
      </div>
    </article>`;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const visibleMatchups = matchups.filter((matchup) => {
    const matchesSport = activeSport === "all" || matchup.sport === activeSport;
    const matchesSearch = `${matchup.away.name} ${matchup.home.name} ${matchup.league}`.toLowerCase().includes(query);
    const matchesSaved = !showSavedOnly || savedMatchups.has(matchup.id);
    return matchesSport && matchesSearch && matchesSaved;
  });

  matchupList.innerHTML = visibleMatchups.map(renderMatchup).join("");
  resultsSummary.textContent = `${String(visibleMatchups.length).padStart(2, "0")} MATCH ${visibleMatchups.length === 1 ? "ANALYSIS" : "ANALYSES"} · ${showSavedOnly ? "SAVED" : "ILLUSTRATIVE DEMO DATA"}`;
  emptyState.hidden = visibleMatchups.length !== 0;
  savedCount.textContent = String(savedMatchups.size);
  savedToggle.classList.toggle("is-active", showSavedOnly);
  savedToggle.setAttribute("aria-pressed", String(showSavedOnly));
  matchupList.querySelectorAll("[data-save-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const { saveId } = button.dataset;
      if (savedMatchups.has(saveId)) savedMatchups.delete(saveId);
      else savedMatchups.add(saveId);
      render();
    });
  });
}

sportTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeSport = tab.dataset.sport;
    sportTabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });
    render();
  });
});

searchInput.addEventListener("input", render);

savedToggle.addEventListener("click", () => {
  showSavedOnly = !showSavedOnly;
  render();
});

clearFilters.addEventListener("click", () => {
  activeSport = "all";
  showSavedOnly = false;
  searchInput.value = "";
  sportTabs.forEach((tab) => {
    const isActive = tab.dataset.sport === "all";
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });
  render();
  searchInput.focus();
});

function updateAnalystSport() {
  const isSoccer = analystSport.value === "soccer";
  const metric = isSoccer ? "Goals" : "Points";
  const maximum = isSoccer ? "20" : "200";
  document.querySelectorAll(".scoring-label").forEach((label) => {
    label.textContent = `${metric} scored / game`;
  });
  document.querySelectorAll(".conceding-label").forEach((label) => {
    label.textContent = `${metric} allowed / game`;
  });
  analystForm.querySelectorAll('input[type="number"]').forEach((input) => {
    input.max = maximum;
  });
  const examples = isSoccer ? ["1.4", "1.2", "1.8", "1.0"] : ["21.4", "19.8", "23.6", "20.2"];
  analystForm.querySelector('[name="awayScored"]').value = examples[0];
  analystForm.querySelector('[name="awayAllowed"]').value = examples[1];
  analystForm.querySelector('[name="homeScored"]').value = examples[2];
  analystForm.querySelector('[name="homeAllowed"]').value = examples[3];
  analystForm.querySelector('[name="awayName"]').value = isSoccer ? "Visitor FC" : "Visitor Team";
  analystForm.querySelector('[name="homeName"]').value = isSoccer ? "Home United" : "Home Team";
}

analystSport.addEventListener("change", updateAnalystSport);

analystForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!analystForm.reportValidity()) return;

  const formData = new FormData(analystForm);
  const sport = String(formData.get("sport"));
  const metricLimit = sport === "soccer" ? 20 : 200;
  const readTeam = (prefix, side) => {
    const scored = Number(formData.get(`${prefix}Scored`));
    const allowed = Number(formData.get(`${prefix}Allowed`));
    if (!Number.isFinite(scored) || !Number.isFinite(allowed) || scored < 0 || allowed < 0 || scored > metricLimit || allowed > metricLimit) {
      throw new RangeError(`Enter ${sport === "soccer" ? "goal" : "point"} averages between 0 and ${metricLimit}.`);
    }
    const name = String(formData.get(`${prefix}Name`)).trim();
    if (!name) throw new RangeError("Enter a name for each team.");
    const abbreviation = name.split(/\s+/).slice(0, 3).map((word) => word[0]).join("").toUpperCase();
    return { name, abbreviation, side, scored, allowed };
  };

  try {
    const matchup = {
      id: "custom-analyst",
      sport,
      league: sport === "soccer" ? "SOCCER · YOUR INPUT" : "AMERICAN FOOTBALL · YOUR INPUT",
      kickoff: "CUSTOM ANALYSIS",
      away: readTeam("away", "AWAY"),
      home: readTeam("home", "HOME"),
    };
    analyzedMatchup = matchup;
    analystResultCard.innerHTML = renderMatchup(matchup, true);
    analystResult.hidden = false;
    document.querySelector("#analyst-error").hidden = true;
    analystResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    const feedback = document.querySelector("#analyst-error");
    feedback.textContent = error.message;
    feedback.hidden = false;
  }
});

analystForm.addEventListener("input", () => {
  document.querySelector("#analyst-error").hidden = true;
});

document.querySelector("#clear-analysis").addEventListener("click", () => {
  analystResult.hidden = true;
  analyzedMatchup = null;
  analystResultCard.replaceChildren();
});

analystResultCard.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save-id]");
  if (!button || !analyzedMatchup) return;
  if (savedMatchups.has(button.dataset.saveId)) savedMatchups.delete(button.dataset.saveId);
  else savedMatchups.add(button.dataset.saveId);
  render();
  analystResultCard.innerHTML = renderMatchup(analyzedMatchup);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

render();