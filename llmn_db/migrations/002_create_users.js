exports.up = (pgm) => {
  pgm.createTable({ schema: 'llmn', name: 'users' }, {
    id:            { type: 'serial', primaryKey: true },
    username:      { type: 'varchar(100)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    role:          { type: 'varchar(20)', notNull: true, default: "'user'" },
    created_at:    { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  })
}

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llmn', name: 'users' })
}
