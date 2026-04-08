exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'models' }, {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(100)', notNull: true },
    display_name: { type: 'varchar(255)' },
    base_model: { type: 'varchar(100)' },
    model_type: { type: 'varchar(20)', notNull: true },
    version: { type: 'integer', notNull: true, default: 1 },
    adapter_path: { type: 'varchar(500)' },
    parent_models_id: { type: 'integer', references: { schema: 'llamune', name: 'models' } },
    trained_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'models' });
};
