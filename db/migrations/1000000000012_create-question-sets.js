exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'question_sets' }, {
    id: { type: 'serial', primaryKey: true },
    poc_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'poc' } },
    system_prompts_id: { type: 'integer', references: { schema: 'llamune', name: 'system_prompts' } },
    name: { type: 'varchar(100)', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: "'draft'" },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'question_sets' });
};
