exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'learning_text_chunks' }, {
    id: { type: 'serial', primaryKey: true },
    learning_texts_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'learning_texts' } },
    chunk_index: { type: 'integer', notNull: true },
    content: { type: 'text', notNull: true },
    token_count: { type: 'integer' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'learning_text_chunks' });
};
