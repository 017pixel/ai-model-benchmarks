import { useEffect, useState } from "react";
import { projects, profile, languages, type Lang } from "./data";

const langColors: Record<Lang, string> = {
  Python: "#3776AB",
  JavaScript: "#E8B53A",
  HTML: "#E44D26",
  Kotlin: "#7F52FF",
  TypeScript: "#3178C6",
};

const typePhrases = [
  "KI-Entwickler @ AISCI Ident GmbH",
  "AGI erschaffen & KI-Ethik voranbringen",
  "Projekte ohne Budget, mit Charakter",
  "15 Jahre alt — und voll am Coden",
];

function useTheme() {
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem("theme") || "light";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) };
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useTypewriter() {
  const [text, setText] = useState("");
  useEffect(() => {
    let pi = 0;
    let ci = 0;
    let deleting = false;
    let timer: number;
    const tick = () => {
      const phrase = typePhrases[pi];
      if (!deleting) {
        ci++;
        setText(phrase.slice(0, ci));
        if (ci === phrase.length) {
          deleting = true;
          timer = window.setTimeout(tick, 1600);
          return;
        }
      } else {
        ci--;
        setText(phrase.slice(0, ci));
        if (ci === 0) {
          deleting = false;
          pi = (pi + 1) % typePhrases.length;
        }
      }
      timer = window.setTimeout(tick, deleting ? 38 : 70);
    };
    timer = window.setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, []);
  return text;
}

export default function App() {
  const { theme, toggle } = useTheme();
  const typed = useTypewriter();
  useReveal();
  const [filter, setFilter] = useState<string>("Alle");
  const [navOpen, setNavOpen] = useState(false);

  const filtered = filter === "Alle" ? projects : projects.filter((p) => p.language === filter);

  return (
    <>
      <header className={`nav ${navOpen ? "open" : ""}`}>
        <div className="wrap nav-inner">
          <a
            className="brand"
            href="#top"
            onClick={() => setNavOpen(false)}
          >
            <span className="mark" />
            {profile.name}
          </a>
          <nav className="nav-links">
            <a href="#about" onClick={() => setNavOpen(false)}>Über</a>
            <a href="#work" onClick={() => setNavOpen(false)}>Projekte</a>
            <a href="#stack" onClick={() => setNavOpen(false)}>Stack</a>
            <a href="#goals" onClick={() => setNavOpen(false)}>Ziele</a>
            <a href="#contact" onClick={() => setNavOpen(false)}>Kontakt</a>
          </nav>
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label="Theme wechseln"
            title={theme === "light" ? "Dunkel" : "Hell"}
          >
            {theme === "light" ? "◐" : "◑"}
          </button>
          <button
            className="nav-burger"
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Menü"
          >
            {navOpen ? "×" : "≡"}
          </button>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <div className="hero-eyebrow mono">
                {profile.handle} · {profile.location} · {profile.age} Jahre
              </div>
              <h1>
                <span className="ln"><span>Benjamin</span></span>
                <span className="ln"><span className="accent">Becker</span></span>
              </h1>
              <div className="type-line">
                {typed}
                <span className="cursor" />
              </div>
            </div>
            <aside className="hero-card reveal">
              <div className="hc-head">
                <span>~/benjamin.json</span>
                <span>●</span>
              </div>
              <div className="row"><span>role</span><b>{profile.role}</b></div>
              <div className="row"><span>company</span><b>{profile.company}</b></div>
              <div className="row"><span>focus</span><b>AGI · Ethik</b></div>
              <div className="row"><span>stars</span><b>{profile.stats.stars}</b></div>
              <div className="row"><span>repos</span><b>{profile.stats.repos}</b></div>
              <div className="row" style={{ marginTop: 12 }}>
                <span>github</span>
                <a href={profile.github} target="_blank" rel="noreferrer">017pixel</a>
              </div>
            </aside>
          </div>

          <div className="wrap">
            <div className="stats reveal">
              <div className="stat">
                <div className="num">{profile.stats.projects}</div>
                <div className="lbl">Projekte</div>
              </div>
              <div className="stat">
                <div className="num">{profile.stats.repos}</div>
                <div className="lbl">Repositories</div>
              </div>
              <div className="stat">
                <div className="num">{profile.stats.stars}</div>
                <div className="lbl">GitHub-Sterne</div>
              </div>
              <div className="stat">
                <div className="num">{profile.stats.followers}</div>
                <div className="lbl">Follower</div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="section" id="about">
          <div className="wrap">
            <div className="section-head">
              <div>
                <span className="section-tag">01 — Über mich</span>
                <h2>Code mit Haltung.</h2>
              </div>
              <p className="section-intro">
                Ich baue KI, die denkt — und zeige, dass gute Software nicht teuer sein muss.
              </p>
            </div>
            <div className="about-grid">
              <p className="about-lead reveal">
                Ich bin <span className="hl">{profile.age}</span> und entwickle als{" "}
                <span className="hl">{profile.role}</span> an der Schnittstelle von{" "}
                <span className="hl">AGI</span> und <span className="hl">KI-Ethik</span>.
                Meine Mission: eine denkende Maschine erschaffen — und das{" "}
                <span className="hl">kostenlos</span> für alle.
              </p>
              <div className="about-body reveal">
                <p>
                  <strong>Warum ich mache, was ich mache:</strong> Projekte ohne Budget
                  beweisen, dass Geld nicht alles ist. Mit CHAPPiE arbeite ich an einer
                  Simulation eines denkenden Lebewesens, mit DailyQuest habe ich bei
                  Jugend forscht überzeugt.
                </p>
                <p>
                  <strong>Was mich antreibt:</strong> Neugier, Sport und die Idee, dass
                  KI ethisch und offen gestaltet sein sollte. Ich lerne ständig dazu —
                  gerade Kotlin und TypeScript.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PROJECTS */}
        <section className="section" id="work">
          <div className="wrap">
            <div className="section-head">
              <div>
                <span className="section-tag">02 — Arbeit</span>
                <h2>Ausgewählte Projekte.</h2>
              </div>
              <p className="section-intro">
                Vom AGI-Prototyp bis zur Pomodoro-App — alles auf GitHub, alles open.
              </p>
            </div>

            <div className="filters">
              {languages.map((l) => (
                <button
                  key={l}
                  className={`filter ${filter === l ? "active" : ""}`}
                  onClick={() => setFilter(l)}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="projects">
              {filtered.map((p, i) => (
                <article className="card reveal" key={p.name}>
                  <div className="card-top">
                    <div>
                      <div className="card-index">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <h3>{p.name}</h3>
                    </div>
                    <span
                      className={`status ${p.status === "In Entwicklung" ? "dev" : ""}`}
                    >
                      <span className="s-dot" />
                      {p.status}
                    </span>
                  </div>
                  <p className="desc">{p.description}</p>
                  {p.highlights && (
                    <div className="hl-list">
                      {p.highlights.map((h) => (
                        <span className="chip" key={h}>{h}</span>
                      ))}
                    </div>
                  )}
                  <div className="card-foot">
                    <span className="lang">
                      <span
                        className="swatch"
                        style={{ background: langColors[p.language] }}
                      />
                      {p.language}
                    </span>
                    <span className="card-meta">
                      ★ {p.stars} · ⑂ {p.forks}
                      <a
                        className="card-link"
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Repo ↗
                      </a>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* STACK */}
        <section className="section" id="stack">
          <div className="wrap">
            <div className="section-head">
              <div>
                <span className="section-tag">03 — Werkzeugkasten</span>
                <h2>Was ich kann.</h2>
              </div>
              <p className="section-intro">
                Routiniert in Python &amp; Web — Kotlin und TypeScript sind in Arbeit.
              </p>
            </div>
            <div className="stack-grid">
              {profile.stack.map((s) => {
                const v =
                  s.level === "Expert"
                    ? 1
                    : s.level === "Sicher"
                    ? 0.8
                    : 0.45;
                return (
                  <div
                    className="stack-item reveal"
                    key={s.name}
                    style={{ "--v": v } as React.CSSProperties}
                  >
                    <div className="name">{s.name}</div>
                    <div className="stack-bar">
                      <i />
                    </div>
                    <div className="stack-level">{s.level}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ACHIEVEMENTS */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <div>
                <span className="section-tag">04 — Erfolge</span>
                <h2>Ausgezeichnet.</h2>
              </div>
            </div>
            <div className="ach-list reveal">
              {profile.achievements.map((a) => (
                <div className="ach" key={a.title}>
                  <span className="yr">{a.year}</span>
                  <div>
                    <div className="t">{a.title}</div>
                    <div className="n">{a.note}</div>
                  </div>
                  <span className="badge">Award</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GOALS */}
        <section className="section" id="goals">
          <div className="wrap">
            <div className="section-head">
              <div>
                <span className="section-tag">05 — Roadmap</span>
                <h2>Was als Nächstes.</h2>
              </div>
              <p className="section-intro">
                Ein paar Tasks auf meiner Liste — abgehakt und offen.
              </p>
            </div>
            <div className="goals reveal">
              {profile.goals.map((g) => (
                <div className={`goal ${g.done ? "done" : ""}`} key={g.text}>
                  <span className="box">{g.done ? "✓" : ""}</span>
                  <span className="txt">{g.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="contact" id="contact">
          <div className="wrap">
            <span className="section-tag">06 — Kontakt</span>
            <h2 style={{ marginTop: 18 }}>
              Lass uns was<br />
              <a href={`mailto:${profile.email}`}>bauen.</a>
            </h2>
            <p className="sub">
              Feedback, Ideen oder einfach ein Stern für meine Projekte — ich freue
              mich über jede Nachricht.
            </p>
            <div className="contact-actions">
              <a className="btn primary" href={`mailto:${profile.email}`}>
                Email schreiben
              </a>
              <a className="btn" href={profile.github} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <span>© {new Date().getFullYear()} {profile.name} · {profile.handle}</span>
          <span>
            Gebaut mit <span className="heart">◈</span> &amp; opencode — kein Budget,
            viel Charakter.
          </span>
        </div>
      </footer>
    </>
  );
}
