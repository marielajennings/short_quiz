module.exports = db => {
  const Response = db.Model.extend({
    tableName: 'short-quiz_responses',
    idAttribute: 'id',
    hasTimestamps: true,
    user: function() {
      return this.belongsTo('User', 'user_id', 'id');
    }
  });
  return db.model('Response', Response);
};
