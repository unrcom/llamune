exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'question_set_snapshots' }, {
    id: { type: 'serial', primaryKey: true },
    question_sets_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'question_sets' } },
    system_prompt_snapshots_id: { type: 'integer', references: { schema: 'llamune', name: 'system_prompt_snapshots' } },
    name: { type: 'varchar(100)', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'question_set_snapshots' });
};
