exports.up = (pgm) => {
  pgm.addColumn({ schema: 'llmn', name: 'models' }, {
    system_prompt: { type: 'text', notNull: false }
  })
}

exports.down = (pgm) => {
  pgm.dropColumn({ schema: 'llmn', name: 'models' }, 'system_prompt')
}
