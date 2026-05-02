exports.up = (pgm) => {
  pgm.createSchema('llmn', { ifNotExists: true })
}

exports.down = (pgm) => {
  pgm.dropSchema('llmn', { cascade: true })
}
