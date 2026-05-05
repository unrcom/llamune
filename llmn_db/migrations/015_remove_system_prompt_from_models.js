exports.up = (pgm) => {
  pgm.dropColumn({ schema: 'llmn', name: 'models' }, 'system_prompt')
}

exports.down = (pgm) => {
  pgm.addColumn({ schema: 'llmn', name: 'models' }, {
    system_prompt: { type: 'text', notNull: false }
  })
}
