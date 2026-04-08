exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'answer_snapshots' }, {
    id: { type: 'serial', primaryKey: true },
    answers_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'answers' } },
    questions_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'questions' } },
    answer: { type: 'text', notNull: true },
    answer_type: { type: 'varchar(20)', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'answer_snapshots' });
};
