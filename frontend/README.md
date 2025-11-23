This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash

frontend/
│
├── app/
│   ├── page.tsx                       → Landing page
│   │
│   ├── host/
│   │   ├── create/page.tsx            → Quiz creation (host UI)
│   │   ├── quiz/[id]/page.tsx         → Host quiz live controller (Host dashboard)
│   │
│   ├── play/
│   │   ├── join/page.tsx              → Enter quiz code / quiz id
│   │   ├── quiz/[id]/page.tsx         → Player answering screen (like Kahoot)
│   │   ├── leaderboard/[id]/page.tsx  → Leaderboard screen
│   │
│   ├── api/
│   │   ├── backend.ts                 → axios instance for backend
│
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   │
│   ├── quiz/
│   │   ├── HostQuestionCard.tsx
│   │   ├── PlayerQuestionCard.tsx
│   │   ├── QuizTimer.tsx
│   │   ├── LeaderboardTable.tsx
│   │
│   ├── ui/                            → Shadcn UI components
│
├── hooks/
│   ├── useQuizHost.ts                 → host controls logic
│   ├── useQuizPlayer.ts               → join/submit answers
│   ├── useLeaderboard.ts
│
├── store/
│   ├── quizStore.ts                   → Zustand global state

```