exports.up = (pgm) => {
  pgm.createTable({ schema: 'llmn', name: 'question_sets' }, {
    id:                { type: 'serial', primaryKey: true },
    project_id:        { type: 'integer', notNull: true, references: { schema: 'llmn', name: 'projects' }, onDelete: 'CASCADE' },
    system_prompts_id: { type: 'integer', references: { schema: 'llmn', name: 'system_prompts' } },
    name:              { type: 'varchar(100)', notNull: true },
    status:            { type: 'varchar(20)', notNull: true, default: "'draft'" },
    created_at:        { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  })
}

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llmn', name: 'question_sets' })
}
