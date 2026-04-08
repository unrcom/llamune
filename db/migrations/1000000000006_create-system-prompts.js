exports.up = (pgm) => {
  pgm.createTable({ schema: 'llamune', name: 'system_prompts' }, {
    id: { type: 'serial', primaryKey: true },
    poc_id: { type: 'integer', notNull: true, references: { schema: 'llamune', name: 'poc' } },
    name: { type: 'varchar(100)', notNull: true },
    content: { type: 'text', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: "'active'" },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llamune', name: 'system_prompts' });
};
