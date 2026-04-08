exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'question_snapshots' }, {
    id: { type: 'serial', primaryKey: true },
    questions_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'questions' } },
    question: { type: 'text', notNull: true },
    training_role: { type: 'integer' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'question_snapshots' });
};
