-- Create questions table to store quiz questions
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of answer options: ["Option A", "Option B", "Option C", "Option D"]
  correct_answer INTEGER NOT NULL, -- Index of correct answer (0, 1, 2, 3, etc.)
  time_limit INTEGER DEFAULT 30, -- Time limit in seconds for this question
  points INTEGER DEFAULT 100, -- Points awarded for correct answer
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(quiz_id, question_index)
);

-- Create index for faster queries
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_questions_quiz_question_index ON questions(quiz_id, question_index);

-- Add comment explaining the schema
COMMENT ON TABLE questions IS 'Stores individual quiz questions with options and correct answers';
COMMENT ON COLUMN questions.options IS 'JSON array of answer options: ["Option A", "Option B", "Option C", "Option D"]';
COMMENT ON COLUMN questions.correct_answer IS 'Index of the correct answer in the options array (0-based)';
