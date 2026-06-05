exports.up = (pgm) => {
  pgm.createTable({ schema: 'llmn', name: 'chat_logs' }, {
    id:               { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id:       { type: 'uuid', notNull: true },
    turn_cnt:         { type: 'integer', notNull: true },
    model_name:       { type: 'text', notNull: true },
    user_message:     { type: 'text', notNull: true },
    search_mode:      { type: 'text', notNull: true },
    rag_query:        { type: 'text' },
    rag_result:       { type: 'text' },
    system_prompt:    { type: 'text', notNull: true },
    llm_response:     { type: 'text', notNull: true },
    response_time_ms: { type: 'integer', notNull: true },
    created_at:       { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  })

  pgm.createIndex({ schema: 'llmn', name: 'chat_logs' }, 'session_id')
}

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'llmn', name: 'chat_logs' })
}
