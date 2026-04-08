exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'system_prompt_snapshots' }, {
    id: { type: 'serial', primaryKey: true },
    system_prompts_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'system_prompts' } },
    name: { type: 'varchar(100)', notNull: true },
    content: { type: 'text', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'system_prompt_snapshots' });
};
