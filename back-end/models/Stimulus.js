module.exports = db => {
  const Stimulus = db.Model.extend({
    tableName: 'short-quiz_stimuli',
    idAttribute: 'stimulus',
    responses: function () {
      return this.hasMany('Response', 'stimulus', 'stimulus');
    }
  });
  return db.model('Stimulus', Stimulus);
};
