exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'question_set_execution_results' }, {
    id: { type: 'serial', primaryKey: true },
    question_set_executions_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'question_set_executions' } },
    question_snapshots_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'question_snapshots' } },
    answers_id: { type: 'integer', references: { schema: 'llamune', name: 'answers' } },
    status: { type: 'smallint', notNull: true, default: 1 },
    error_message: { type: 'text' },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'question_set_execution_results' });
};
