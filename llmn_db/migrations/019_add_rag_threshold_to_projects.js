exports.up = (pgm) => {
  pgm.addColumn({ schema: 'llmn', name: 'projects' }, {
    rag_threshold: { type: 'real', notNull: true, default: 1 },
  })
}

exports.down = (pgm) => {
  pgm.dropColumn({ schema: 'llmn', name: 'projects' }, 'rag_threshold')
}
