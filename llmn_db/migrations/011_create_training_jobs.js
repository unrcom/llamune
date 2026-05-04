exports.up = (pgm) => {
  pgm.createTable({ schema: 'llmn', name: 'training_jobs' }, {
    id:             { type: 'serial', primaryKey: true },
    project_id:     { type: 'integer', notNull: true, references: { schema: 'llmn', name: 'projects' }, onDelete: 'CASCADE' },
    models_id:      { type: 'integer', notNull: true, references: { schema: 'llmn', name: 'models' } },
    status:         { type: 'varchar(20)', notNull: true, default: "'pending'" },
    training_mode:  { type: 'integer', notNull: true, default: 2 },
    max_seq_length: { type: 'integer', notNull: true, default: 8192 },
    iters:          { type: 'integer', notNull: true, default: 100 },
    batch_size:     { type: 'integer', notNull: true, default: 1 },
    learning_rate:  { type: 'float' },
    adapter_path:   { type: 'text' },
    error_message:  { type: 'text' },
    started_at:     { type: 'timestamp' },
    finished_at:    { type: 'timestamp' },
    created_at:     { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  })
}

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llmn', name: 'training_jobs' })
}
