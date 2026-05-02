exports.up = (pgm) => {
  pgm.createTable({ schema: 'llmn', name: 'system_prompts' }, {
    id:         { type: 'serial', primaryKey: true },
    project_id: { type: 'integer', notNull: true, references: { schema: 'llmn', name: 'projects' }, onDelete: 'CASCADE' },
    name:       { type: 'varchar(100)', notNull: true },
    content:    { type: 'text', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  })
}

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llmn', name: 'system_prompts' })
}
