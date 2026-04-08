exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'learning_text_snapshots' }, {
    id: { type: 'serial', primaryKey: true },
    learning_texts_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'learning_texts' } },
    title: { type: 'varchar(255)', notNull: true },
    source_url: { type: 'varchar(500)' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'learning_text_snapshots' });
};
