exports.up = (pgm) => {
  pgm.createTable({ schema: 'llmn', name: 'models' }, {
    id:               { type: 'serial', primaryKey: true },
    name:             { type: 'varchar(255)', notNull: true },
    display_name:     { type: 'varchar(255)', notNull: true },
    model_type:       { type: 'varchar(20)', notNull: true, default: "'base'" },
    adapter_path:     { type: 'text' },
    parent_models_id: { type: 'integer', references: { schema: 'llmn', name: 'models' } },
    trained_at:       { type: 'timestamp' },
    created_at:       { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  })
}

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llmn', name: 'models' })
}
