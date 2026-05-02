exports.up = (pgm) => {
  pgm.createTable({ schema: 'llmn', name: 'refresh_tokens' }, {
    id:         { type: 'serial', primaryKey: true },
    users_id:   { type: 'integer', notNull: true, references: { schema: 'llmn', name: 'users' }, onDelete: 'CASCADE' },
    token:      { type: 'text', notNull: true, unique: true },
    expires_at: { type: 'timestamp', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  })
}

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llmn', name: 'refresh_tokens' })
}
