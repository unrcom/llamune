exports.up = (pgm) => {
  pgm.createTable({ schema: 'llmn', name: 'projects' }, {
    id:           { type: 'serial', primaryKey: true },
    name:         { type: 'varchar(100)', notNull: true, unique: true },
    display_name: { type: 'varchar(100)', notNull: true },
    created_at:   { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  })
}

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llmn', name: 'projects' })
}
