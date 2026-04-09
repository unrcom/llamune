export interface User {
  id: number
  username: string
  is_admin: boolean
  created_at: string
}

export interface Model {
  id: number
  name: string
  display_name: string | null
  base_model: string | null
  model_type: string
  version: number
  adapter_path: string | null
  parent_models_id: number | null
  trained_at: string | null
  created_at: string
}

export interface Poc {
  id: number
  name: string
  display_name: string
  models_id: number | null
  model_name: string | null
  model_display_name: string | null
  model_version: number | null
  created_at: string
}

export interface SystemPrompt {
  id: number
  poc_id: number
  name: string
  content: string
  status: string
  created_at: string
}

export interface Question {
  id: number
  poc_id: number
  question: string
  training_role: number | null
  status: string
  created_at: string
}

export interface Answer {
  id: number
  questions_id: number
  models_id: number | null
  answer: string
  answer_type: string
  status: string
  created_at: string
}

export interface QuestionSet {
  id: number
  poc_id: number
  system_prompts_id: number | null
  name: string
  status: string
  created_at: string
  questions: Question[]
}

export interface ExecutionResult {
  id: number
  question_set_executions_id: number
  question_snapshots_id: number
  answers_id: number | null
  status: number
  error_message: string | null
  question_text: string | null
  answer_text: string | null
}

export interface Execution {
  id: number
  question_set_snapshots_id: number
  models_id: number
  status: number
  executed_at: string
  finished_at: string | null
  results: ExecutionResult[]
}

export interface TrainingJob {
  id: number
  poc_id: number
  models_id: number | null
  question_set_snapshots_id: number | null
  learning_text_snapshots_id: number | null
  name: string
  status: string
  training_mode: number
  iters: number
  batch_size: number
  learning_rate: number
  num_layers: number
  max_seq_length: number
  loss_threshold: number | null
  output_model_name: string | null
  instance_id: string | null
  error_message: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export interface LearningText {
  id: number
  poc_id: number
  title: string
  source_url: string | null
  raw_text: string | null
  status: string
  created_at: string
}

export interface LearningTextChunk {
  id: number
  learning_texts_id: number
  chunk_index: number
  content: string
  token_count: number | null
  created_at: string
}
