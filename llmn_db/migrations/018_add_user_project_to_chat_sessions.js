exports.up = (pgm) => {
  pgm.addColumns({ schema: 'llmn', name: 'chat_sessions' }, {
    user_id:    { type: 'integer', references: '"llmn"."users"(id)', onDelete: 'SET NULL' },
    project_id: { type: 'integer', references: '"llmn"."projects"(id)', onDelete: 'SET NULL' },
  })

  pgm.createIndex({ schema: 'llmn', name: 'chat_sessions' }, 'user_id')
  pgm.createIndex({ schema: 'llmn', name: 'chat_sessions' }, 'project_id')
}

exports.down = (pgm) => {
  pgm.dropIndex({ schema: 'llmn', name: 'chat_sessions' }, 'project_id')
  pgm.dropIndex({ schema: 'llmn', name: 'chat_sessions' }, 'user_id')
  pgm.dropColumns({ schema: 'llmn', name: 'chat_sessions' }, ['user_id', 'project_id'])
}
