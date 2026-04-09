# 🏎️ RaceMind — AI-Powered F1 Race Strategy Simulator

> **One-Line Pitch:**
> RaceMind is an explainable AI system that simulates Formula 1 races and makes real-time strategy decisions using physics, optimization, and learning.

---

## 🧩 Problem Statement Alignment

**Track: Formula 1 & Motorsport Innovation**

RaceMind directly addresses this track by building:

* A racing simulation platform
* A strategy analytics engine
* A performance decision system inspired by real F1 pit wall operations

---

## 🎯 Project Overview

RaceMind is a real-time Formula 1 race strategy simulator that uses **physics-based AI** to:

* Monitor tire degradation, fuel, weather, and race gaps
* Simulate 20–30 strategy scenarios every lap
* Recommend optimal pit stops with confidence scores
* Adapt decisions based on user goals
* Learn from past races and improve over time

This is **not a game** — it’s a **digital twin of an F1 pit wall system**.

---

## ⚡ Quick Overview

RaceMind simulates a live F1 race and:

* Predicts optimal pit stop timing
* Selects best tire compounds
* Adapts to weather and tire wear
* Provides explainable AI recommendations
* Supports autonomous execution (Auto Mode)

---

## 💡 Core Innovation

RaceMind uses a **physics-first approach** instead of black-box ML.

### Techniques Used:

* Deterministic strategy optimization (grid search)
* Physics-based tire degradation models
* Multi-objective decision system
* Experience-based learning (race memory)

### Why it matters:

* ✅ Explainable decisions
* ⚡ Real-time performance
* 🎯 Reliable and deterministic

---

## 🔄 How It Works (Simplified)

Every **1.8 seconds**:

1. Simulates tire wear and fuel usage
2. Predicts lap time
3. Evaluates 20–30 strategies
4. Selects optimal outcome
5. Generates recommendation
6. Auto-executes if confidence > 85%

---

## ✨ Key Features

### Simulation Engine

* 50-lap real-time race simulation
* 15 circuits with unique physics
* Tire degradation + thermal effects
* Weather-integrated performance

### Strategy Engine

* Exhaustive pit strategy optimization
* Confidence-based AI decisions
* Strategy goals: Position / Time / Risk
* Explainable recommendations

### Autonomous Mode

* Auto pit when confidence > 85%
* Voice race engineer feedback
* Manual override always available

### Learning System

* Stores race results
* Learns optimal strategies per track
* Improves future recommendations

---

## 🏗️ Architecture Overview

* **Physics Engine** → Tire wear, lap time
* **Strategy Engine** → Optimization & decisions
* **Race State** → Core simulation data
* **Race Memory** → Learning system
* **UI Layer** → Dashboard, charts, AI panel

---

## 🤖 AI / ML Techniques

RaceMind uses **8 real-world AI techniques**:

1. Grid search optimization
2. Parametric physics modeling
3. Confidence scoring heuristic
4. Rule-based alert system
5. Climate simulation model
6. Experience-based learning
7. Goal-conditioned optimization
8. Multi-agent simulation

---

## ⚙️ Physics Engine Highlights

* Quadratic tire degradation (“cliff effect”)
* Track-specific abrasion multipliers
* Thermal wear adjustments
* Fuel-weight lap time impact

---

## 💾 Learning System (Race Memory)

* Stores race data locally
* Learns:

  * Optimal pit window
  * Best compounds
  * Tire life
* Boosts future AI confidence

---

## 🎯 Strategy Goal System

| Goal              | Behavior     |
| ----------------- | ------------ |
| Maximize Position | Aggressive   |
| Minimize Time     | Balanced     |
| Low Risk          | Conservative |

---

## 🤖 Auto Strategy Mode

* Auto executes decisions at **85%+ confidence**
* 8-lap cooldown
* Full user override

---

## 🌍 Real-World Relevance

RaceMind solves:

> “When is the optimal time to pit?”

### Applications:

* Motorsport analytics
* Esports strategy tools
* Racing simulators

---

## 🚀 Setup Instructions

```bash
# Clone repo
git clone <repo-url>
cd RaceMind

# Install
npm install

# Run
npm run dev
```

Open: [http://localhost:5173](http://localhost:5173)

---

## 🛠️ Tech Stack

* React 19 + TypeScript
* Vite 8
* Tailwind CSS
* Recharts
* Web Audio API
* OpenWeatherMap API
* Ergast + OpenF1 APIs

---

## ⌨️ Keyboard Shortcuts

| Key   | Action     |
| ----- | ---------- |
| Space | Start/Stop |
| P     | Pit        |
| W     | What-if    |
| M     | Mute       |

---

## 🏁 Why RaceMind Stands Out

* Explainable AI decisions
* Real-time optimization
* Physics-based modeling
* Adaptive behavior
* Self-learning system

---

## 📊 Summary

RaceMind combines:

* Physics
* Optimization
* AI decision-making
* Real-time simulation

To deliver a **professional-grade F1 strategy system**.

---

*"In Formula 1, races are won or lost in the pit lane. RaceMind ensures you make the right call."*
