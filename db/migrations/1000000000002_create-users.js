exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'users' }, {
    id: { type: 'serial', primaryKey: true },
    username: { type: 'varchar(50)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    is_admin: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'users' });
};
