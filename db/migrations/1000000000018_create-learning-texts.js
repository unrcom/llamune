exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'learning_texts' }, {
    id: { type: 'serial', primaryKey: true },
    poc_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'poc' } },
    title: { type: 'varchar(255)', notNull: true },
    source_url: { type: 'varchar(500)' },
    raw_text: { type: 'text' },
    status: { type: 'varchar(20)', notNull: true, default: "'active'" },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'learning_texts' });
};
