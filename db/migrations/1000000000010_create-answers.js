exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'answers' }, {
    id: { type: 'serial', primaryKey: true },
    questions_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'questions' } },
    models_id: { type: 'integer', references: { schema: 'llamune', name: 'models' } },
    answer: { type: 'text', notNull: true },
    answer_type: { type: 'varchar(20)', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: "'active'" },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'answers' });
};
