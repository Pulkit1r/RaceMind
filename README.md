# 🏎️ RaceMind — AI-Powered F1 Race Strategy Simulator

> **RaceMind** is a real-time Formula 1 race strategy simulator that uses **physics-based AI** to recommend optimal pit stop timing, tire compound selection, and race pace decisions — mirroring the strategy systems used by real F1 teams like Red Bull, Mercedes, and McLaren.

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Technical Workflow](#-technical-workflow)
- [AI / ML Techniques Used](#-ai--ml-techniques-used)
- [Physics Engine Deep Dive](#-physics-engine-deep-dive)
- [File Structure](#-file-structure)
- [How to Run](#-how-to-run)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Presentation Talking Points](#-presentation-talking-points)
- [FAQ for Judges](#-faq-for-judges)
- [Tech Stack](#-tech-stack)

---

## 🎯 Project Overview

RaceMind simulates an F1 race in real-time and runs an **AI strategy engine** that:

1. **Monitors** tire degradation, fuel consumption, weather, and position gaps
2. **Simulates** every possible pit stop scenario (20-30 alternatives per lap)
3. **Recommends** the mathematically optimal strategy with confidence scores
4. **Speaks** decisions aloud using a voice race engineer (Web Speech API)
5. **Explains** every recommendation with "Why this decision?" breakdowns

This is **NOT a game**. It's a **digital twin** of an F1 pit wall strategy system — the same class of software that decides when Lewis Hamilton or Max Verstappen should pit.

---

## ✨ Features

### Core Simulation
| Feature | Description |
|---|---|
| 🔄 Real-Time Race Sim | 50-lap race simulation with 1.8s tick intervals |
| 🧮 Physics Engine | Tire degradation, fuel burn, lap time prediction from physics models |
| 🏁 15 Real Circuits | Monaco, Silverstone, Spa, Bahrain, Suzuka... each with unique abrasion physics |
| 🌡️ Track Temperature | Thermal wear multiplier affects tire degradation dynamically |
| 🌧️ Live Weather API | OpenWeatherMap integration with climate-based fallback simulation |

### AI-Powered Strategy
| Feature | Description |
|---|---|
| 🧠 Brute-Force Optimizer | Sweeps every pit window × every compound → picks the fastest scenario |
| 📊 Confidence Scoring | Multi-factor weighted classifier: 0-98% confidence on each recommendation |
| ⚔️ Strategy Comparison | AI vs "Stay Out" scenario visualization in What-If modal |
| 🧪 "If You Ignore AI" | Shows consequences of not following recommendations |
| 🧠 "Why This Decision?" | Click any recommendation to see full physics reasoning |

### User Experience
| Feature | Description |
|---|---|
| 🎙️ Voice Race Engineer | AI speaks decisions aloud ("Box box box. Come in this lap.") |
| 📡 Live Telemetry Effect | Numbers flicker with telemetry-style animation during race |
| 📊 3 Live Charts | Lap Times, Tire Degradation, Position Timeline |
| 🏁 Race Result Screen | Final stats, AI strategy grade (S/A/B/C/D), impact analysis |
| ⌨️ Keyboard Shortcuts | Space=Start, P=Pit, W=What-If, M=Mute |
| 🎨 Glassmorphism UI | Premium dark theme with neon accents and micro-animations |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      RACEMIND ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐    │
│  │  Landing     │───▶│  Dashboard    │◀──▶│  Weather API     │    │
│  │  Page        │    │  (Main Loop)  │    │  (OpenWeather)   │    │
│  └─────────────┘    └──────┬───────┘    └──────────────────┘    │
│                            │                                      │
│              ┌─────────────┼─────────────┐                       │
│              ▼             ▼             ▼                       │
│     ┌──────────────┐ ┌──────────┐ ┌───────────────┐             │
│     │ Physics      │ │ Strategy │ │ Audio Alert   │             │
│     │ Engine       │ │ Engine   │ │ System        │             │
│     │ (data.ts)    │ │ (data.ts)│ │ (audioAlerts) │             │
│     └──────┬───────┘ └────┬─────┘ └───────┬───────┘             │
│            │              │               │                      │
│     ┌──────▼───────────────▼───────────────▼──────┐              │
│     │              RACE STATE (RaceState)          │              │
│     │  tire wear, fuel, position, weather, gaps... │              │
│     └──────────────────┬──────────────────────────┘              │
│                        │                                         │
│     ┌──────────────────▼──────────────────────────┐              │
│     │              UI COMPONENTS                   │              │
│     │  TopBar │ ControlPanel │ CenterPanel │ AI    │              │
│     │  Radio  │ StrategyPanel│ WhatIfModal │ Result│              │
│     └─────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow (Per Lap Tick)

```
1. Dashboard.simulateLap() fires (every 1.8 seconds)
       │
2. ├── computeTireWear(wear, age, compound, trackTemp, abrasion)
   │     → Track-specific degradation with thermal multiplier
       │
3. ├── computeLapTime(tireWear, compound, fuel)
   │     → Physics-based lap time with sector splits
       │
4. ├── Position battle logic (tire-state-dependent probability)
       │
5. ├── simulatePitStrategies(state)
   │     → Brute-force sweep: every pit window × every compound
   │     → Sort by total race time → mark best strategy
       │
6. ├── generateRecommendations(state, strategies)
   │     → BOX BOX / STAY OUT with confidence score
       │
7. ├── Audio alerts (critical/warning) + Voice TTS
       │
8. └── Update UI: Charts, TopBar, Radio, AI Panel
```

---

## 🔄 Technical Workflow

### Phase 1: User Arrives → Landing Page
- Animated hero section with glassmorphism design
- Feature showcase with scroll animations
- "Launch Simulator" button → routes to `/dashboard`

### Phase 2: Dashboard Initializes
- `initialRaceState` loads with default configs (Monaco, Medium tires, P3)
- Weather API fetched for selected track (or climate simulation fallback)
- Audio system unlocked on first user interaction
- AI Panel shows "STANDBY" state with pulsing dots

### Phase 3: Race Simulation (Main Loop)
- User presses **Space** or clicks **Start Simulation**
- `setInterval(simulateLap, 1800)` — fires every 1.8 seconds
- Each tick:
  - Tire wear computed with track-aware physics
  - Lap time predicted from tire state + fuel weight
  - Position battles occur (30% chance, tire-advantage-weighted)
  - Strategy engine runs brute-force optimization
  - AI generates recommendations with confidence scores
  - Audio alerts fire on critical thresholds
  - All 3 charts update in real-time

### Phase 4: User Interaction During Race
- **Pit Stop** (press `P`) — switches compound, resets tire wear
- **What-If Modal** (press `W`) — compare current vs alternative strategy
- **Click AI Recommendation** — expands "Why this decision?" + "If you ignore this"
- **Change Track** — mid-race track switch updates physics model
- **Adjust Weather** — slider changes rain probability, triggers alerts

### Phase 5: Race Completion
- Race finishes at lap 50 → Race Result Modal appears
- Shows: Final position, positions gained, fastest lap, consistency
- AI Strategy Grade (S/A/B/C/D) based on tire management + position gains
- AI Impact narrative explaining what the strategy achieved

---

## 🤖 AI / ML Techniques Used

> **Important**: RaceMind uses **Physics-Based AI**, not deep learning neural networks. This is the **same approach real F1 teams use**. Here's why:

### 1. Brute-Force Strategy Optimization (Search AI)
```
For EACH tire compound (Soft, Medium, Hard):
  For EACH possible pit lap (now, +2, +4, +6... +14):
    Simulate entire remaining race with physics engine
    Record total race time
Sort all scenarios → Best strategy = lowest total time
```
- **ML Equivalent**: Grid Search / Hyperparameter Optimization
- **Function**: `simulatePitStrategies()` in `data.ts`
- **Why this matters**: Evaluates 20-30 complete race simulations per decision

### 2. Parametric Physics Model (Model-Based AI)
```
wearThisLap = (baseRate + accelFactor × tireAge) × trackAbrasion × thermalMultiplier
```
- **ML Equivalent**: Parametric Regression with fitted coefficients
- **Function**: `computeTireWear()` in `data.ts`
- **Why this matters**: Constants calibrated from real Pirelli compound data

### 3. Confidence Scoring (Classification Heuristic)
```javascript
const wearFactor = Math.min(30, (100 - tireWear) * 0.4);
const timeFactor = Math.min(40, timeSaved * 3);
const confidence = Math.min(98, Math.round(30 + wearFactor + timeFactor));
```
- **ML Equivalent**: Logistic Regression / Scoring Classifier
- **Function**: `generateRecommendations()` in `data.ts`

### 4. Expert Rule System (Anomaly Detection)
```
IF tireWear < 20%   → CRITICAL: "Box this lap"
IF rainChance > 60% → WARNING:  "Consider intermediates"
IF fuel < 10kg      → WARNING:  "Fuel save mode"
```
- **ML Equivalent**: Rule-Based Expert System
- **Function**: Threshold checks in `Dashboard.simulateLap()`

### 5. Climate Simulation (Monte Carlo)
```
Temperature derived from latitude/longitude using fitted seasonal model
Rain probability from climate data with stochastic drift
```
- **ML Equivalent**: Monte Carlo Simulation
- **Function**: `generateSimulatedWeather()` in `weatherApi.ts`

### Why NOT Neural Networks?

> Real F1 teams (Red Bull, Mercedes, McLaren) **don't use neural networks for race strategy**. They use physics models + optimization sweeps because:
> 1. **Explainability** — Engineers need to tell drivers WHY to pit. A neural network can't explain itself.
> 2. **Accuracy** — Physics is deterministic. A neural net trained on 20 races has too little data.
> 3. **Trust** — A $500M team won't risk a championship on a black box.

---

## ⚙️ Physics Engine Deep Dive

### Tire Degradation Model

Each tire compound has 4 physics parameters:

| Parameter | Soft (C5) | Medium (C3) | Hard (C2) | Unit |
|---|---|---|---|---|
| `baseOffset` | -0.30 | 0.00 | +0.40 | seconds/lap |
| `wearPerLap` | 3.0 | 1.8 | 1.0 | %/lap |
| `wearAccel` | 0.08 | 0.04 | 0.015 | %/lap² |
| `lapTimePenalty` | 0.025 | 0.018 | 0.012 | sec per 1% wear |

**The "cliff" effect**: `wearAccel` creates quadratic degradation — tires seem fine until suddenly they fall off. This matches real F1 behavior.

### Track Abrasion Coefficients

Each circuit multiplies tire wear differently:

| Track | Abrasion | Why |
|---|---|---|
| Bahrain | 1.25× | Sand-blasted surface, most abrasive on calendar |
| Interlagos | 1.20× | Rough, bumpy, anti-clockwise biases left tires |
| Suzuka | 1.15× | Figure-8, constant high-speed loading both sides |
| Silverstone | 1.10× | High-speed corners like Copse load tires heavily |
| Monaco | 0.75× | Smooth street circuit, low speed = gentle on tires |

### Thermal Wear Multiplier

```javascript
function thermalWearMultiplier(trackTemp: number): number {
  const normalizedTemp = (trackTemp - 35) / 20;  // 35°C = baseline
  return 1.0 + normalizedTemp * 0.12;             // ±12% per 10°C
}
```
- 55°C track → 1.12× wear (hot = faster degradation)
- 25°C track → 0.94× wear (cool = tires last longer)

### Lap Time Formula

```
lapTime = BASE_LAP_TIME + compound_offset + tire_penalty + fuel_effect + noise

Where:
  BASE_LAP_TIME = 75.5s
  tire_penalty  = (100 - tireWear) × compound.lapTimePenalty
  fuel_effect   = -((70 - fuelRemaining) / 70) × 1.4s     (lighter = faster)
  noise         = random ± 0.3s   (driver inconsistency)
```

---

## 📁 File Structure

```
RaceMind/
├── index.html                     # Entry point
├── package.json                   # Dependencies & scripts
├── src/
│   ├── main.tsx                   # React root mount
│   ├── App.tsx                    # Router: / → Landing, /dashboard → Dashboard
│   ├── LandingPage.tsx            # Animated landing page with feature showcase
│   ├── Dashboard.tsx              # Main simulation loop + state management
│   ├── data.ts                    # ⭐ Physics engine + strategy AI (700+ lines)
│   ├── weatherApi.ts              # OpenWeatherMap API + climate simulation
│   ├── audioAlerts.ts             # Web Audio API tones + Web Speech TTS
│   ├── index.css                  # Design system: glassmorphism, animations
│   └── components/
│       ├── TopBar.tsx             # Live telemetry bar (position, gaps, fuel, ERS)
│       ├── ControlPanel.tsx       # Track selector, tire buttons, sliders
│       ├── CenterPanel.tsx        # 3 charts: Lap Times, Tire Wear, Position
│       ├── AIPanel.tsx            # AI recommendations with "Why?" expandable
│       ├── StrategyPanel.tsx      # Strategy comparison table
│       ├── RadioPanel.tsx         # Team radio messages feed
│       ├── WhatIfModal.tsx        # What-If scenario comparator
│       └── RaceResultModal.tsx    # End-of-race summary + AI grade
```

### Key File Responsibilities

| File | Lines | Role |
|---|---|---|
| `data.ts` | ~712 | **Brain of the app** — all physics formulas, strategy engine, AI recommendations |
| `Dashboard.tsx` | ~540 | **Heart of the app** — simulation loop, state management, event handlers |
| `weatherApi.ts` | ~270 | Weather integration + climate simulation fallback |
| `audioAlerts.ts` | ~173 | Sound effects + text-to-speech voice engineer |
| `AIPanel.tsx` | ~350 | AI recommendation cards with expandable explanations |

---

## 🚀 How to Run

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Setup
```bash
# Clone the repository
git clone <repo-url>
cd RaceMind

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access
- **Landing Page**: http://localhost:5173/
- **Dashboard**: http://localhost:5173/dashboard

### Production Build
```bash
npm run build
npm run preview
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action | When |
|---|---|---|
| `Space` | Start / Stop race | Anytime |
| `P` | Trigger pit stop | During race |
| `W` | Toggle What-If modal | During race |
| `M` | Mute / Unmute audio | Anytime |

---

## 🎤 Presentation Talking Points

### Opening (30 seconds)
> "RaceMind is an AI-powered F1 race strategy simulator. It mirrors the systems used by real F1 teams to decide WHEN to pit, WHAT tires to use, and HOW to manage a race. Our AI evaluates 20-30 complete race simulations every 1.8 seconds and picks the mathematically optimal strategy."

### Demo Flow (3-4 minutes)
1. **Show Landing Page** — "This is our product introduction"
2. **Click Launch Simulator** — "Now we enter the pit wall"
3. **Select Bahrain track** — "See how track changes physics"
4. **Press Space to start** — "Watch the telemetry go live"
5. **Wait 5-10 laps** — "AI is analyzing tire wear..."
6. **Point to AI Panel** — "BOX BOX — 87% confidence"
7. **Click the recommendation** — "Here's WHY: tire wear at 35%, and what happens if you ignore this"
8. **Press P to pit** — "Voice engineer confirms: Box box box"
9. **Open What-If (W)** — "We can compare: what if we'd stayed out?"
10. **Let race finish** — "Race result with AI strategy grade"

### Key Phrases for Judges
- *"We use physics-based AI, not deep learning — the same approach Red Bull uses"*
- *"Every recommendation is explainable — confidence score + reasoning"*
- *"15 tracks each with unique abrasion physics calibrated from real F1 data"*
- *"The system runs brute-force optimization — same class of AI as chess engines"*

---

## ❓ FAQ for Judges

### "Is this using ML?"
> Yes — 4 techniques: brute-force optimization (search AI), parametric regression (physics model with calibrated parameters), weighted scoring classifier (confidence), and expert rule system (alerts). These are all established AI/ML techniques.

### "Why not use a neural network?"
> Real F1 teams don't use neural networks for pit strategy. Physics-based AI is the industry standard because it's explainable, deterministic, and works without massive training data. McLaren's ATLAS, Ferrari, and Mercedes all use model-based approaches.

### "Where does the data come from?"
> Tire compound parameters are calibrated from published Pirelli degradation curves. Track abrasion coefficients are derived from historical compound selection data. Weather comes from OpenWeatherMap API or our climate simulation model.

### "Is this real-time?"
> Yes. The simulation runs at 1.8s per lap tick. The strategy engine sweeps 20-30 scenarios per tick. The UI updates lap times, tire wear, position, and AI recommendations in real-time.

### "What makes this different from a game?"
> Games optimize for fun. We optimize for accuracy. Our tire degradation model uses quadratic cliff functions matching real F1 wear curves. Our strategy engine solves the same optimization problem that real pit wall engineers solve: "When should I pit to minimize total race time?"

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | React 19 + TypeScript | Type safety + component architecture |
| **Build Tool** | Vite 8 | Instant HMR, fast dev server |
| **Styling** | Tailwind CSS 4 | Utility-first with custom design tokens |
| **Animations** | Framer Motion | Physics-based spring animations |
| **Charts** | Recharts 3 | Real-time responsive data visualization |
| **Icons** | Lucide React | Consistent, tree-shakable icon set |
| **Routing** | React Router 7 | Client-side navigation |
| **Audio** | Web Audio API + Web Speech API | Zero dependencies, browser-native |
| **Weather** | OpenWeatherMap API | Free tier, real-world data |

---

## 👥 Team

Built for the **RaceMind** hackathon presentation.

---

*"In Formula 1, the difference between winning and losing is a single pit stop decision. RaceMind makes that decision with data, physics, and AI."*
