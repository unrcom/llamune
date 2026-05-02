exports.up = (pgm) => {
  pgm.createTable({ schema: 'llmn', name: 'ft_conversations' }, {
    id:               { type: 'serial', primaryKey: true },
    project_id:       { type: 'integer', notNull: true, references: { schema: 'llmn', name: 'projects' }, onDelete: 'CASCADE' },
    question_sets_id: { type: 'integer', references: { schema: 'llmn', name: 'question_sets' } },
    messages:         { type: 'jsonb', notNull: true },
    created_at:       { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  })
}

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llmn', name: 'ft_conversations' })
}
