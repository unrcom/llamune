exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'refresh_tokens' }, {
    id: { type: 'serial', primaryKey: true },
    users_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'users' } },
    token: { type: 'varchar(255)', notNull: true, unique: true },
    expires_at: { type: 'timestamp', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'refresh_tokens' });
};
