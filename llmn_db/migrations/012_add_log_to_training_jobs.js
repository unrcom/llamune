exports.up = (pgm) => {
  pgm.addColumn({ schema: 'llmn', name: 'training_jobs' }, {
    log: { type: 'text' },
  })
}

exports.down = (pgm) => {
  pgm.dropColumn({ schema: 'llmn', name: 'training_jobs' }, 'log')
}
