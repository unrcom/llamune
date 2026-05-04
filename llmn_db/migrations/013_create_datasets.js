exports.up = (pgm) => {
  pgm.createTable({ schema: 'llmn', name: 'datasets' }, {
    id:           { type: 'serial', primaryKey: true },
    project_id:   { type: 'integer', notNull: true, references: '"llmn"."projects"(id)', onDelete: 'CASCADE' },
    name:         { type: 'varchar(100)', notNull: true, unique: true },
    display_name: { type: 'varchar(100)', notNull: true },
    description:  { type: 'text' },
    created_at:   { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  })
}

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llmn', name: 'datasets' })
}
