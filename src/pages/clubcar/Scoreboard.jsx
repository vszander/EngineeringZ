import React from "react";
import "./Scoreboard.css";

import { useEffect, useState } from "react";

const initialTeams = [
  {
    key: "team1",
    name: "Augusta Angels",
    img: "https://imagedelivery.net/W308T4lESzXbW3jX49a-3g/d9723626-cb96-4454-bcb7-353dd729f300/public",
    monthlyPoints: 245,
    accuracy: "95%",
    hits: 2567,
  },
  {
    key: "team2",
    name: "Team Ernest",
    img: "https://imagedelivery.net/W308T4lESzXbW3jX49a-3g/baaffb51-84f2-4198-cff2-2401e1a71500/public",
    monthlyPoints: 225,
    accuracy: "93%",
    hits: 2222,
  },
  {
    key: "team3",
    name: "Marvel-us",
    img: "https://imagedelivery.net/W308T4lESzXbW3jX49a-3g/ba71195c-d3c9-41e5-cd70-38286c755900/public",
    monthlyPoints: 105,
    accuracy: "83%",
    hits: 3252,
  },
  {
    key: "team4",
    name: "Graveyard Shift",
    img: "https://imagedelivery.net/W308T4lESzXbW3jX49a-3g/02c73a06-a8ae-4e88-9100-6fa5024deb00/public",
    monthlyPoints: 205,
    accuracy: "95%",
    hits: 3052,
  },
];

const mitzo = {
  label: "Mitzo of the Month:",
  name: "Monica",
  img: "https://imagedelivery.net/W308T4lESzXbW3jX49a-3g/97597154-0b3a-4ae0-80e9-5112fcd34200/public",
};

export default function Scoreboard() {
  const [teams, setTeams] = useState(initialTeams);

  const reigningTeam = {
    label: "Reigning Team:",
    name: "Team Ernest",
    // Optional: reuse that team's image to “stamp” the winner.
    img: teams[1].img,
  };

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      setTeams((prev) => {
        const bump = Math.floor(Math.random() * 3 + 1); // 1..3

        return prev.map((t) => {
          if (t.key === "team4") {
            return { ...t, hits: t.hits + bump };
          }

          if (t.key === "team2" && bump === 2) {
            return { ...t, hits: t.hits + 1 };
          }

          return t;
        });
      });

      // Random cadence:
      // mostly ~2s, occasional 1s bursts
      const nextDelay =
        Math.random() < 0.35
          ? 900 + Math.random() * 300 // fast burst (≈1s)
          : 1800 + Math.random() * 500; // normal pace (≈2s)

      setTimeout(tick, nextDelay);
    };

    tick(); // start loop

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mhsaScoreboard">
      <div className="mhsaScoreboard__inner">
        <div className="mhsaScoreboard__header">
          <div className="mhsaScoreboard__title">
            Material Handling Scoreboard
          </div>
          <div className="mhsaScoreboard__subtitle">
            Turning barcode scanning into a friendly contest (enablement, not
            punishment).
          </div>
        </div>

        <div className="mhsaScoreboard__grid">
          {teams.map((t) => (
            <div className="teamCard" key={t.key}>
              <div className="teamCard__titleWrap">
                <div className="pillGold3D">
                  <span className="textEngraved">{t.name}</span>
                </div>
              </div>

              <div className="teamCard__hero">
                <img
                  className="teamCard__img"
                  src={t.img}
                  alt={t.name}
                  loading="lazy"
                />
                <div className="teamCard__imgGlow" aria-hidden="true" />
              </div>

              <div className="teamCard__stats">
                <div className="statRow">
                  <div className="pillTitle">Monthly Points:</div>

                  <div className="pillGold">
                    <span className="textEngravedDeep">{t.monthlyPoints}</span>
                  </div>
                </div>

                <div className="statRow">
                  <div className="pillTitle">Accuracy Score:</div>

                  <div className="pillGold">
                    <span className="textEngravedDeep">{t.accuracy}</span>
                  </div>
                </div>

                <div className="statRow">
                  <div className="pillTitle">Scanner Hits:</div>

                  <div className="pillGold">
                    <span className="textEngravedDeep">
                      {t.hits.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mhsaScoreboard__footer">
          <div className="awardCard">
            <div className="awardHeader">{mitzo.label}</div>

            <div className="awardCard__content">
              <div className="awardCard__imgWrap">
                <img
                  className="awardCard__img"
                  src={mitzo.img}
                  alt={mitzo.name}
                  loading="lazy"
                />
                <div className="awardCard__imgGlow" aria-hidden="true" />
              </div>

              <div className="pillPlaqueImg">
                <span className="textEngravedDeep">{mitzo.name}</span>
              </div>
            </div>
          </div>

          <div className="awardCard awardCard--right">
            <div className="awardHeader">{reigningTeam.label}</div>

            <div className="awardCard__content awardCard__content--right">
              <div className="pillPlaqueImg">
                <span className="textEngravedDeep">{reigningTeam.name}</span>
              </div>

              <div className="awardCard__imgWrap awardCard__imgWrap--stamp">
                <img
                  className="awardCard__img awardCard__img--stamp"
                  src={reigningTeam.img}
                  alt={reigningTeam.name}
                  loading="lazy"
                />
                <div className="awardCard__imgGlow" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div className="mhsaScoreboard__note">
          <span className="mhsaScoreboard__noteDot" />
          Tip: Later, each dotted box can bind to <code>
            MHSA_Preferences
          </code>{" "}
          (team names, scoring labels, award titles, cycle timing, etc.).
        </div>
      </div>
    </div>
  );
}
