"use client";

import { useEffect, useMemo, useState } from "react";
import Starfield from "./components/Starfield";
import { SIGNS, findSign, generate, signFromBirthdate, todayISO } from "../lib/data";

export default function Home() {
  const [signKey, setSignKey] = useState(SIGNS[0].key);
  const [theme, setTheme] = useState("system");
  const [findOpen, setFindOpen] = useState(false);
  const [dateLine, setDateLine] = useState("");
  const [ready, setReady] = useState(false);

  // Restore saved sign + theme on mount
  useEffect(() => {
    try {
      const savedSign = localStorage.getItem("horosphere-signe");
      if (savedSign && SIGNS.some((s) => s.key === savedSign)) setSignKey(savedSign);
      const savedTheme = localStorage.getItem("horosphere-theme");
      if (savedTheme) setTheme(savedTheme);
    } catch (e) {}
    try {
      const d = new Date();
      setDateLine(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d));
    } catch (e) {
      setDateLine(new Date().toLocaleDateString("fr-FR"));
    }
    setReady(true);
  }, []);

  // Apply theme to <html data-theme>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.setAttribute("data-theme", "light");
    else if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    try {
      localStorage.setItem("horosphere-theme", theme);
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("horosphere-signe", signKey);
    } catch (e) {}
  }, [signKey]);

  const sign = useMemo(() => findSign(signKey), [signKey]);
  const horoscope = useMemo(() => generate(signKey, todayISO()), [signKey]);

  function handleBirthdateChange(e) {
    const value = e.target.value;
    if (!value) return;
    const [, m, d] = value.split("-").map((v) => parseInt(v, 10));
    setSignKey(signFromBirthdate(m, d));
    setFindOpen(false);
  }

  return (
    <>
      <Starfield />
      <div className="wrap">
        <header>
          <div className="brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5L19 19M19 5l-2.5 2.5M7.5 16.5L5 19" />
            </svg>
            Horosphère
          </div>
          <h1>Votre horoscope du jour</h1>
          <div className="date-line">{ready ? dateLine : ""}</div>
        </header>

        <nav className="picker" aria-label="Choisir un signe astrologique">
          {SIGNS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={"chip" + (s.key === signKey ? " active" : "")}
              aria-pressed={s.key === signKey}
              onClick={() => setSignKey(s.key)}
            >
              <span className="sym">{s.symbole}</span>
              <span>{s.nom}</span>
            </button>
          ))}
        </nav>

        <div className="find-row">
          <button className="find-toggle" type="button" onClick={() => setFindOpen((v) => !v)}>
            Je ne connais pas mon signe — entrer ma date de naissance
          </button>
          <div className={"find-panel" + (findOpen ? " open" : "")}>
            <input type="date" aria-label="Date de naissance" onChange={handleBirthdateChange} />
          </div>
        </div>

        <main className="card">
          <div className="card-head">
            <div className="glyph">{sign.symbole}</div>
            <div>
              <div className="sign-name">{sign.nom}</div>
              <div className="sign-meta">{sign.dates} · {sign.element} · {sign.planete}</div>
            </div>
          </div>

          <p className="headline">{horoscope.headline}</p>

          <div className="field">
            <div className="field-label"><span className="dot" style={{ background: "var(--rose)" }} />Amour</div>
            <p>{horoscope.amour}</p>
          </div>
          <div className="field">
            <div className="field-label"><span className="dot" style={{ background: "var(--gold)" }} />Travail</div>
            <p>{horoscope.travail}</p>
          </div>
          <div className="field">
            <div className="field-label"><span className="dot" style={{ background: "var(--lilac)" }} />Énergie</div>
            <p>{horoscope.forme}</p>
          </div>

          <div className="meters">
            <Meter name="Amour" value={horoscope.scoreAmour} color="var(--rose)" />
            <Meter name="Travail" value={horoscope.scoreTravail} color="var(--gold)" />
            <Meter name="Énergie" value={horoscope.scoreForme} color="var(--lilac)" />
          </div>

          <div className="advice">
            <div className="field-label">Conseil du jour</div>
            <p>{horoscope.conseil}</p>
          </div>

          <div className="lucky">
            <div className="lucky-item">
              <div className="lucky-label">Couleur</div>
              <div className="swatch" style={{ background: horoscope.couleur.hex }} />
              <div className="lucky-value">{horoscope.couleur.nom}</div>
            </div>
            <div className="lucky-item">
              <div className="lucky-label">Chiffre</div>
              <div className="lucky-num">{horoscope.chiffre}</div>
            </div>
            <div className="lucky-item">
              <div className="lucky-label">Talisman</div>
              <div className="lucky-value">{horoscope.talisman}</div>
            </div>
          </div>
        </main>

        <footer>
          MVP · les prédictions se régénèrent chaque jour, de façon stable pour la journée.
          <br />
          <div className="theme-toggle" role="group" aria-label="Thème">
            <button className={theme === "system" ? "active" : ""} onClick={() => setTheme("system")}>Système</button>
            <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>Clair</button>
            <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>Sombre</button>
          </div>
        </footer>
      </div>
    </>
  );
}

function Meter({ name, value, color }) {
  return (
    <div className="meter-row">
      <div className="meter-top">
        <span className="meter-name">{name}</span>
        <span className="meter-val">{value} %</span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ background: color, transform: `scaleX(${value / 100})` }} />
      </div>
    </div>
  );
}
