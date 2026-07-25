export type Lang = "Python" | "JavaScript" | "HTML" | "Kotlin" | "TypeScript";
export type Status = "Beta" | "In Entwicklung" | "Live" | "Lernprojekt";

export interface Project {
  name: string;
  description: string;
  language: Lang;
  stars: number;
  forks: number;
  url: string;
  status: Status;
  featured?: boolean;
  highlights?: string[];
  category: "KI & AGI" | "Web & Apps" | "Lernen & Experimente" | "Spiel & Fun";
}

export const profile = {
  name: "Benjamin Becker",
  handle: "017pixel",
  age: 15,
  role: "KI-Entwickler",
  company: "AISCI Ident GmbH",
  location: "Deutschland",
  email: "beckerbenjamin2010@gmail.com",
  github: "https://github.com/017pixel",
  mission: "AGI erschaffen & KI-Ethik voranbringen",
  bio: "KI Ethik, KI Entwicklung, kostenlose Sachen machen",
  stats: {
    repos: 16,
    stars: 47,
    followers: 19,
    projects: 12,
  },
  tools: ["opencode", "Codex", "Gemini", "VS Code", "Neovim", "tmux", "GitHub", "Vercel", "Supabase", "Convex"],
  stack: [
    { name: "Python", level: "Expert" },
    { name: "JavaScript", level: "Sicher" },
    { name: "HTML5", level: "Sicher" },
    { name: "CSS3", level: "Sicher" },
    { name: "TypeScript", level: "Lernend" },
    { name: "Kotlin", level: "Lernend" },
  ],
  achievements: [
    { title: "1. Platz Jugend forscht (Regional)", note: "mit DailyQuest", year: "2026" },
    { title: "Sonderpreis Digitalisierung NRW", note: "für DailyQuest", year: "2026" },
    { title: "GenAI-Kurs", note: "Codedex — abgeschlossen", year: "2025" },
    { title: "MINT-Camp Workshop", note: "Front-End, Style & JS", year: "2025" },
  ],
  goals: [
    { text: "CHAPPiE Grundstruktur entwickeln", done: true },
    { text: "DailyQuest für Jugend forscht vorbereiten", done: true },
    { text: "Kotlin lernen", done: false },
    { text: "Erste AGI-Prototype-Tests", done: false },
    { text: "Community um CHAPPiE aufbauen", done: false },
  ],
};

export const projects: Project[] = [
  {
    name: "CHAPPiE",
    description:
      "Versuch, eine Simulation eines denkenden Lebewesens zu erschaffen — eine Zwei-Schritte KI-Architektur mit mehrschichtigem Gedächtnis und autonomem 24/7-Training.",
    language: "Python",
    stars: 5,
    forks: 0,
    url: "https://github.com/017pixel/CHAPPiE",
    status: "In Entwicklung",
    featured: true,
    category: "KI & AGI",
    highlights: ["Zwei-Schritte KI-Architektur", "Mehrschichtiges Gedächtnis", "Autonomes Training 24/7", "vLLM · Cerebras"],
  },
  {
    name: "DailyQuest",
    description:
      "Gamifizierter Sport-Tracker angelehnt an Solo Leveling — tägliche Übungen, Level-System, Dungeons, als installierbare PWA.",
    language: "JavaScript",
    stars: 7,
    forks: 1,
    url: "https://github.com/017pixel/DailyQuest",
    status: "Beta",
    featured: true,
    category: "Web & Apps",
    highlights: ["Level-System & Dungeons", "PWA (installierbar)", "1. Platz Jugend forscht", "Sonderpreis Digitalisierung NRW"],
  },
  {
    name: "Bred",
    description: "Clean AI Chatbot UI für eigene API Keys — schlank, schnell, ohne Ablenkung.",
    language: "JavaScript",
    stars: 3,
    forks: 0,
    url: "https://github.com/017pixel/Bred",
    status: "Live",
    featured: true,
    category: "KI & AGI",
    highlights: ["Gemini API", "Clean UI", "Eigene Keys"],
  },
  {
    name: "HomeOrganizer",
    description:
      "Hausarbeits-Organisations-App für meine Mutter. Neon-Brutalismus-Stil getestet — sieht gut aus und funktioniert als PWA.",
    language: "HTML",
    stars: 5,
    forks: 0,
    url: "https://github.com/017pixel/HomeOrganizer",
    status: "Live",
    featured: true,
    category: "Web & Apps",
    highlights: ["Neon Brutalismus", "PWA", "Familien-Projekt"],
  },
  {
    name: "Vibe",
    description:
      "Komplett kostenlose Forest/Focus-Tree-Alternative — eine Pomodoro-WebApp mit schönem Design, Gamification und eigenem wachsendem Wald.",
    language: "JavaScript",
    stars: 3,
    forks: 0,
    url: "https://github.com/017pixel/Vibe",
    status: "Live",
    featured: true,
    category: "Web & Apps",
    highlights: ["Pomodoro", "Gamification", "Wachsender Wald"],
  },
  {
    name: "Sandbox--Zerstoerer",
    description: "Physik-Sandbox-Simulator zum Spielen und experimentieren mit Elementen.",
    language: "JavaScript",
    stars: 3,
    forks: 0,
    url: "https://github.com/017pixel/Sandbox--Zerstoerer",
    status: "Live",
    featured: true,
    category: "Spiel & Fun",
    highlights: ["Physik-Simulation", "Sandbox"],
  },
  {
    name: "Website_Analyzer",
    description:
      "Python-Skript, das Webseiten technisch & inhaltlich analysiert — von WHOIS-Daten bis zu einer KI-gestützten Inhaltsbewertung mit der Gemini API.",
    language: "Python",
    stars: 2,
    forks: 0,
    url: "https://github.com/017pixel/Website_Analyzer",
    status: "Live",
    category: "KI & AGI",
    highlights: ["WHOIS", "SEO-Analyse", "Gemini API"],
  },
  {
    name: "Wetter-in-der-Welt",
    description: "Kleine Wetter-Web-App, gebaut an einem Tag im MINT-Camp Workshop zum Thema Front-End, Style & JS.",
    language: "JavaScript",
    stars: 3,
    forks: 0,
    url: "https://github.com/017pixel/Wetter-in-der-Welt",
    status: "Live",
    category: "Web & Apps",
    highlights: ["Workshop", "Wetter-API", "Front-End"],
  },
  {
    name: "Der-Adventure-Adventskalender",
    description: "Ein Adventskalender für meine Familie mit Weihnachtswitzen, -fakten und Motivationssprüchen.",
    language: "JavaScript",
    stars: 2,
    forks: 0,
    url: "https://github.com/017pixel/Der-Adventure-Adventskalender",
    status: "Live",
    category: "Spiel & Fun",
    highlights: ["Familie", "Weihnachten", "Design"],
  },
  {
    name: "BredVoice",
    description: "Sprach-Erweiterung rund um den Bred-Chatbot-Ansatz.",
    language: "JavaScript",
    stars: 2,
    forks: 0,
    url: "https://github.com/017pixel/BredVoice",
    status: "In Entwicklung",
    category: "KI & AGI",
  },
  {
    name: "Kotlin-lernen",
    description: "Alle kleinen Kotlin-Android-APK-Apps, die beim Lernen entstehen — nur zum Gucken.",
    language: "Kotlin",
    stars: 2,
    forks: 0,
    url: "https://github.com/017pixel/Kotlin-lernen",
    status: "Lernprojekt",
    category: "Lernen & Experimente",
    highlights: ["Android APK", "Kotlin"],
  },
  {
    name: "GenAI-Kurs-Projekte",
    description: "Alle Projekte aus dem GenAI-Kurs auf Codedex — kleine Mini-Projekte, viel gelernt, viel Spaß.",
    language: "Python",
    stars: 2,
    forks: 0,
    url: "https://github.com/017pixel/GenAI-Kurs-Projekte",
    status: "Lernprojekt",
    category: "Lernen & Experimente",
    highlights: ["Codedex", "GenAI"],
  },
];

export const languages = ["Alle", "Python", "JavaScript", "HTML", "Kotlin"] as const;
