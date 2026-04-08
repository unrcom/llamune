exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'question_set_items' }, {
    question_sets_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'question_sets' } },
    questions_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'questions' } },
    order_index: { type: 'integer', notNull: true },
  });
  pgm.addConstraint({ schema: 'llamune', name: 'question_set_items' }, 'question_set_items_pkey', 'PRIMARY KEY (question_sets_id, questions_id)');
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'question_set_items' });
};
