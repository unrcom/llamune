exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'question_set_executions' }, {
    id: { type: 'serial', primaryKey: true },
    question_set_snapshots_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'question_set_snapshots' } },
    models_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'models' } },
    status: { type: 'smallint', notNull: true, default: 1 },
    executed_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    finished_at: { type: 'timestamp' },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'question_set_executions' });
};
