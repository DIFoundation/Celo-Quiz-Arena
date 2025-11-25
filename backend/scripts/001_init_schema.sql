-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  host VARCHAR(255) NOT NULL,
  token VARCHAR(255) DEFAULT '0x0',
  num_winners INT DEFAULT 3,
  equal_split BOOLEAN DEFAULT true,
  percentages FLOAT8[] DEFAULT ARRAY[]::FLOAT8[],
  metadata_uri TEXT,
  contract_address VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  started BOOLEAN DEFAULT false,
  started_at TIMESTAMP,
  finalized_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  wallet VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  score INT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT now(),
  UNIQUE(quiz_id, wallet)
);

-- Create questions table (stored as part of quiz metadata, but can be queried separately)
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_index INT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of option strings
  correct_answer_index INT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(quiz_id, question_index)
);

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  participant_id INT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_index INT NOT NULL,
  selected_option INT,
  is_correct BOOLEAN,
  answered_at TIMESTAMP DEFAULT now(),
  UNIQUE(quiz_id, participant_id, question_index)
);

-- Create results table (finalized scores after quiz ends)
CREATE TABLE IF NOT EXISTS results (
  id SERIAL PRIMARY KEY,
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  participant_id INT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  total_score INT NOT NULL,
  rank INT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(quiz_id, participant_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_participants_quiz_id ON participants(quiz_id);
CREATE INDEX IF NOT EXISTS idx_participants_wallet ON participants(wallet);
CREATE INDEX IF NOT EXISTS idx_answers_quiz_id ON answers(quiz_id);
CREATE INDEX IF NOT EXISTS idx_answers_participant_id ON answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_index ON answers(question_index);
CREATE INDEX IF NOT EXISTS idx_results_quiz_id ON results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_results_rank ON results(rank);
CREATE INDEX IF NOT EXISTS idx_quizzes_host ON quizzes(host);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
