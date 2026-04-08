exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'poc' }, {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(100)', notNull: true },
    display_name: { type: 'varchar(100)', notNull: true },
    models_id: { type: 'integer', references: { schema: 'llamune', name: 'models' } },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'poc' });
};
