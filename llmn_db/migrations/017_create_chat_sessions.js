exports.up = (pgm) => {
  pgm.createTable({ schema: 'llmn', name: 'chat_sessions' }, {
    id:         { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name:       { type: 'text', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  })

  // 既存の chat_logs に孤立した session_id がある場合、
  // そのセッションの最初のログの created_at を名前・日時として chat_sessions に挿入する
  pgm.sql(`
    INSERT INTO llmn.chat_sessions (id, name, created_at)
    SELECT
      session_id,
      to_char(MIN(created_at) AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD HH24:MI'),
      MIN(created_at)
    FROM llmn.chat_logs
    GROUP BY session_id
    ON CONFLICT (id) DO NOTHING
  `)

  pgm.addConstraint(
    { schema: 'llmn', name: 'chat_logs' },
    'chat_logs_session_id_fkey',
    'FOREIGN KEY (session_id) REFERENCES llmn.chat_sessions(id) ON DELETE CASCADE'
  )
}

exports.down = (pgm) => {
  pgm.dropConstraint(
    { schema: 'llmn', name: 'chat_logs' },
    'chat_logs_session_id_fkey'
  )
  pgm.dropTable({ schema: 'llmn', name: 'chat_sessions' })
}
