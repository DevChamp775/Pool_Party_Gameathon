🎮 POOL PARTY — Win-Win Cooperation

«Contribute. Multiply. Share. Compete.

A real-time multiplayer strategy game based on the Public Goods Game, where teams make secret contribution decisions, build a shared reward pool, and compete to finish with the highest token balance.»

📌 Overview

Gameplay Link: https://interactive-game-dev-ts46.bolt.host

POOL PARTY is a browser-based, multiplayer team strategy game designed to demonstrate cooperation, competition, decision-making, and game theory in an interactive environment.

Every team starts with an equal number of virtual tokens. During each round, teams independently decide how many tokens they want to contribute to a common pool.

The total contribution is multiplied by a predefined multiplier, and the resulting reward is distributed among all participating teams.

Here's the interesting part: even teams that contribute nothing receive a share of the reward!

This creates a strategic dilemma between individual profit and collective success.

The objective is to make strategic decisions, manage your token balance, and finish the game with the highest possible number of tokens.

🎯 Objectives

- Demonstrate the concept of the Public Goods Game.
- Understand the relationship between individual decisions and collective outcomes.
- Encourage strategic thinking and decision-making.
- Explore cooperation, competition, and free-riding behaviour.
- Provide an interactive multiplayer gaming experience.
- Demonstrate how game theory works through real-time gameplay.

🕹️ How to Play

1. Game Setup

- The administrator creates a game session.
- Teams are registered and assigned unique joining credentials.
- Each team receives an initial token balance.
- The administrator configures the number of rounds, pool multiplier, and round duration.

2. Join the Game

- Each team joins using its assigned credentials.
- Teams access their individual dashboards.
- Players can view their wallet balance, game status, and contribution history.

3. Make Your Contribution

- Each team receives a fixed time to decide its contribution.
- Teams can contribute any permitted whole-number amount within their available balance.
- Contributions are secret and cannot be viewed by other teams before the reveal.
- Once submitted, a contribution is locked and cannot be changed.

4. Pool Formation

After all teams submit or the timer expires:

- All contributions are collected.
- The total contribution is calculated.
- The pool multiplier is applied.
- The final reward pool is determined.

Formula:

"Total Pool = Sum of All Team Contributions"

"Total Reward = Floor(Total Pool × Multiplier)"

5. Reward Distribution

By default, the total reward is distributed equally among all participating teams.

"Base Share = Floor(Total Reward / Number of Teams)"

Any remaining tokens are distributed using a deterministic remainder-allocation rule.

Important: Teams that contribute zero tokens still receive their equal share.

6. Leaderboard Update

After every round:

- Team contributions are revealed.
- Rewards are calculated and distributed.
- Wallet balances are updated.
- Round results are displayed.
- The leaderboard is refreshed.

7. Final Results

After the final round, the game calculates the final token balances and determines the winner.

🏆 The team with the highest final token balance wins POOL PARTY!

🏆 Winner Determination

The winner is determined by the highest final wallet balance after all rounds have been settled.

The final results can include:

- Overall winner.
- Top three teams.
- Final token balances.
- Total contributions.
- Total rewards received.
- Net gain or loss.
- Most Cooperative Team.
- Biggest Free-Rider.
- Most Profitable Round.

If multiple teams have the same balance, configured tie-breakers can be applied:

1. Highest total contribution.
2. Highest net gain.
3. Alphabetical team name.

✨ Key Features

🎮 Multiplayer Gameplay

- Multiple teams can participate simultaneously.
- Individual team dashboards.
- Dynamic team registration.
- Unique team joining credentials.

💰 Virtual Token Wallet

- Initial token allocation.
- Real-time balance tracking.
- Contribution and reward history.
- Net gain/loss calculation.
- Transaction ledger.

🔒 Secret Contributions

- Private contribution submission.
- Locked contributions after confirmation.
- No visibility into other teams' contribution amounts before reveal.
- Submission progress tracking without exposing contribution values.

⚡ Real-Time Updates

- Live countdown timers.
- Automatic submission status updates.
- Real-time round progression.
- Instant wallet and leaderboard updates.

📊 Leaderboard & Analytics

- Live team rankings.
- Round-wise performance.
- Contribution trends.
- Reward distribution statistics.
- Final cooperation analysis.

👨‍💻 Administrator Dashboard

- Create and configure game sessions.
- Manage teams.
- Start, pause, and resume gameplay.
- Control round progression.
- Close rounds and reveal contributions.
- Monitor team participation.
- View analytics and transaction records.

📺 Public Display

- Live round information.
- Countdown timer.
- Contribution reveal.
- Reward distribution.
- Leaderboard display.

🧠 Game Theory Behind POOL PARTY

POOL PARTY is inspired by the Public Goods Game, a well-known model in behavioural economics and game theory.

The game demonstrates three important concepts:

1. Cooperation

Teams contribute tokens to a common pool, increasing the total reward available to everyone.

2. Free-Riding

A team can choose not to contribute while still receiving a share of the common reward.

3. Social Dilemma

Individual teams may benefit from contributing less while collectively benefiting when everyone contributes more.

The game illustrates the conflict between individual rationality and collective welfare.

🧮 Reward Calculation Example

Consider a game with four teams and a multiplier of 2.

Team| Contribution
Team A| 20
Team B| 30
Team C| 10
Team D| 0
Total| 60

Step 1: Calculate the pool

60 tokens

Step 2: Apply the multiplier

60 × 2 = 120 tokens

Step 3: Distribute the reward

120 ÷ 4 = 30 tokens per team.

Team| Contribution| Reward| Net Change
A| 20| 30| +10
B| 30| 30| 0
C| 10| 30| +20
D| 0| 30| +30

Team D contributed nothing but received 30 tokens.

This demonstrates the free-rider effect.

🛠️ Technology Stack

The documented system architecture specifies the following technologies:

Component| Technology
Frontend| HTML5, CSS3, JavaScript
Styling| Tailwind CSS
Backend| Python Flask
Database| SQLite
ORM| SQLAlchemy
Real-Time Communication| Flask-SocketIO
Charts & Analytics| Chart.js
Server Communication| REST APIs and WebSockets

Verify these technologies against the actual Bolt-generated repository before publishing if its implementation differs from the architecture specification.

🏗️ System Architecture

The application follows a client-server architecture.

- Administrator Client: Controls the game and manages sessions.
- Team Clients: Submit contributions and monitor individual wallets.
- Public Display: Shows game progress and revealed results.
- Backend Server: Handles game rules, validation, calculations, and real-time events.
- Database: Stores teams, contributions, wallets, transactions, rounds, and results.

The backend is responsible for all important game calculations to maintain consistency and prevent client-side manipulation.

🔄 Game Workflow

1. Administrator creates a session.
2. Teams register and join.
3. Initial tokens are allocated.
4. Administrator starts the first round.
5. Teams submit secret contributions.
6. The round closes.
7. Contributions are revealed.
8. Pool and rewards are calculated.
9. Wallet balances are updated.
10. Leaderboard is refreshed.
11. The next round begins.
12. Final scores are calculated.
13. The winning team is announced.

🔐 Security & Fairness

The architecture incorporates several mechanisms to maintain game integrity:

- Server-side contribution validation.
- Private team authentication.
- One contribution per team per round.
- Immutable submitted contributions.
- Atomic reward settlement.
- Transaction ledger for token movements.
- Prevention of duplicate reward distribution.
- Audit logging for administrator actions.
- Server-side wallet balance verification.

📱 User Roles

Role| Responsibilities
Administrator| Configures and controls the game
Team| Makes strategic contribution decisions
Public Audience| Views live game progress and results

🚀 Future Enhancements

- Advanced game analytics and behavioural insights.
- Additional reward distribution modes.
- Anonymous contribution reveals.
- Custom multiplayer tournaments.
- Downloadable game reports.
- Enhanced animations and sound effects.
- More advanced strategic game variations.
- Historical performance comparisons.

🎓 Educational Significance

POOL PARTY is more than a multiplayer game. It provides a practical demonstration of concepts such as:

- Game Theory.
- Public Goods Game.
- Nash Equilibrium.
- Social Dilemmas.
- Collective Decision-Making.
- Cooperation vs. Competition.
- Free-Rider Problem.
- Strategic Resource Allocation.

It can be used as an interactive learning activity for students interested in economics, behavioural science, mathematics, and decision-making.

👥 Project Information

Project Name: POOL PARTY
Category: Multiplayer Strategy Game
Game Model: Public Goods Game
Platform: Web Application
Tagline: Win-Win Cooperation

📄 License

This project is intended for educational and demonstration purposes. Add an appropriate open-source license before distributing the source code publicly.

---

POOL PARTY — Contribute. Multiply. Share.

Will your team cooperate for collective success, or play strategically for individual victory?
