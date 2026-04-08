exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'question_set_item_snapshots' }, {
    question_set_snapshots_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'question_set_snapshots' } },
    question_snapshots_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'question_snapshots' } },
    order_index: { type: 'integer', notNull: true },
  });
  pgm.addConstraint({ schema: 'llamune', name: 'question_set_item_snapshots' }, 'question_set_item_snapshots_pkey', 'PRIMARY KEY (question_set_snapshots_id, question_snapshots_id)');
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'question_set_item_snapshots' });
};
