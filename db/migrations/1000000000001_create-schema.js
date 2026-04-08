exports.up = (pgm) => {
  pgm.createSchema('llamune');
};

exports.down = (pgm) => {
  pgm.dropSchema('llamune', { cascade: true });
};
