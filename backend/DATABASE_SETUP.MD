# CeloQuizArena Database Setup Guide

## Overview

This guide explains how to set up the PostgreSQL database for CeloQuizArena. The database schema supports:
- Quiz creation and management
- Real-time participant tracking
- Question and answer storage
- Scoring and ranking
- Results and winner determination

## Database Schema

### Tables

#### `quizzes`
Stores quiz metadata and state.
- `id`: Primary key
- `host`: Wallet address of quiz creator
- `token`: ERC-20 token address for prize pool (default: '0x0' for native)
- `num_winners`: Number of winners to distribute prizes to
- `equal_split`: Whether prize pool is split equally among winners
- `percentages`: Custom percentage distribution for winners
- `metadata_uri`: IPFS/storage URI containing quiz questions and metadata
- `contract_address`: Deployed smart contract address for this quiz
- `status`: One of: `pending`, `active`, `ended`, `finalized`, `cancelled`
- `started`: Boolean flag indicating if quiz has started
- `started_at`: Timestamp when quiz started
- `finalized_at`: Timestamp when results were finalized

#### `participants`
Stores players who joined a quiz.
- `id`: Primary key
- `quiz_id`: Foreign key to quizzes
- `wallet`: Participant's wallet address
- `name`: Optional participant name/username
- `score`: Current score (updated by scoring service)
- `joined_at`: Timestamp when participant joined

#### `questions`
Stores individual quiz questions (optional, for quick reference).
- `id`: Primary key
- `quiz_id`: Foreign key to quizzes
- `question_index`: Index in the quiz (0-based)
- `question_text`: The question content
- `options`: JSON array of answer options
- `correct_answer_index`: Index of correct answer

#### `answers`
Stores participant answers to questions.
- `id`: Primary key
- `quiz_id`: Foreign key to quizzes
- `participant_id`: Foreign key to participants
- `question_index`: Which question was answered
- `selected_option`: Index of selected answer (0-based)
- `is_correct`: Whether answer is correct (null until verified)
- `answered_at`: Timestamp of answer submission

#### `results`
Stores finalized results after quiz ends (read-only for frontend).
- `id`: Primary key
- `quiz_id`: Foreign key to quizzes
- `participant_id`: Foreign key to participants
- `total_score`: Final score
- `rank`: Ranking (1 = highest score)

## Setup Instructions

### 1. Prerequisites
- PostgreSQL 12+ installed and running
- Node.js 18+
- Environment variables configured

### 2. Environment Variables
Create a `.env` file in the backend directory:

\`\`\`env
DATABASE_URL=postgresql://username:password@localhost:5432/celo_quiz_arena
NODE_ENV=development
\`\`\`

For production (Vercel, Railway, etc.), use the provided connection string.

### 3. Run Migrations

#### Option A: Using the migration script
\`\`\`bash
cd backend
npm install
node scripts/run-migrations.js
\`\`\`

#### Option B: Manual SQL execution
Connect to your PostgreSQL database and run:
\`\`\`bash
psql $DATABASE_URL < scripts/001_init_schema.sql
\`\`\`

#### Option C: Using a GUI tool (pgAdmin, DBeaver)
1. Connect to your database
2. Open `scripts/001_init_schema.sql`
3. Execute the script

### 4. Verify Setup

\`\`\`sql
-- Check tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public';
\`\`\`

## Data Flow

### Creating a Quiz
1. Host calls `POST /api/quiz` with quiz metadata and contract address
2. New row inserted into `quizzes` table
3. Questions stored in metadata or `questions` table
4. Quiz starts in `pending` status

### Joining a Quiz
1. Player calls `POST /api/quiz/:id/join` with wallet and name
2. New row inserted into `participants` table
3. Player now appears in lobby

### During Quiz
1. As questions are answered, rows inserted into `answers` table
2. `is_correct` is determined by comparing with correct answer
3. Live leaderboard queried from `participants` and `answers` tables

### Ending Quiz
1. Quiz status changed to `ended`
2. `computeAndPersistResults()` called from scoring service
3. Scores calculated and inserted into `results` table
4. Quiz marked as `finalized`
5. Winners determined and prizes distributed on-chain

## Common Queries

### Get quiz with participants
\`\`\`sql
SELECT q.*, COUNT(p.id) as participant_count
FROM quizzes q
LEFT JOIN participants p ON q.id = p.quiz_id
WHERE q.id = 1
GROUP BY q.id;
\`\`\`

### Get live leaderboard
\`\`\`sql
SELECT p.wallet, p.name, p.score,
       COUNT(a.id) FILTER (WHERE a.is_correct = true) as correct_answers
FROM participants p
LEFT JOIN answers a ON p.id = a.participant_id
WHERE p.quiz_id = 1
GROUP BY p.id
ORDER BY p.score DESC;
\`\`\`

### Get finalized results
\`\`\`sql
SELECT r.rank, p.wallet, p.name, r.total_score
FROM results r
JOIN participants p ON r.participant_id = p.id
WHERE r.quiz_id = 1
ORDER BY r.rank;
\`\`\`

## Backup and Restore

### Backup database
\`\`\`bash
pg_dump $DATABASE_URL > backup.sql
\`\`\`

### Restore database
\`\`\`bash
psql $DATABASE_URL < backup.sql
\`\`\`

## Troubleshooting

### Connection refused
- Ensure PostgreSQL is running
- Check DATABASE_URL is correct
- Verify firewall/security group allows connection

### Table already exists
- This is safe, the migrations use `IF NOT EXISTS`
- Run the migration script again without issue

### Permission denied
- Ensure user has CREATE TABLE permission
- Check database ownership and roles

## Next Steps

1. ✅ Database schema created
2. → Backend API endpoints connected
3. → Socket.io event handlers wired
4. → Frontend forms integrated
5. → Smart contract integration for payouts
