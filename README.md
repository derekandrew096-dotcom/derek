# Fieldnotes

A responsive static demo for American football and soccer match analysis. It computes illustrative probabilities and model-implied fair odds from synthetic or user-entered scoring averages.

## Run locally

Open `index.html` in a browser. Choose a sport in AI Match Analyst, enter two teams' average points/goals scored and allowed per game, and select Analyze this matchup. The app uses plain HTML, CSS, and JavaScript and requires no build step, API key, or network connection for its analysis.

## Model and limitations

The sample team statistics and matchups in `script.js` are fictional—not live data. American football estimates blend points scored and allowed per game, apply a small home-field adjustment, and convert the expected margin with a logistic curve. Soccer estimates blend goals scored and conceded per game, then use an independent Poisson score model to estimate home-win, draw, and away-win probabilities.

The custom analyst is a deterministic statistical demo, not a trained AI model. The simple formulas have not been validated against real match results and do not claim 99% accuracy. Fair odds are the inverse of the model probabilities and are not bookmaker quotes. No bets can be placed.

## Publish

The site deploys to GitHub Pages with the workflow in `.github/workflows/pages.yml` whenever changes are pushed to `main`. The first workflow run enables GitHub Pages and publishes the static site.
