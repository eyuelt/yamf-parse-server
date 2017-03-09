
function getQueryUserObject(user_id) {
  var userObject = new Parse.User();
  userObject.id = user_id;
  return userObject;
}

function removePaired(user, callback) {
  var userObject = getQueryUserObject(user.id);
  var query = new Parse.Query(Parse.User);
  query.equalTo('partner', userObject);
  query.each(function(partner) {
    console.log('Found user to update');
    partner.set('isPaired', false);
    partner.save(null, {useMasterKey: true});
  }, {useMasterKey: true}).then(function() {
    console.log('Done updating users');
    callback();
  }, function(error) {
    console.error("Got an error " + error.code + " : " + error.message);
    callback();
  });
}

Parse.Cloud.beforeSave(Parse.User, function(request, response) {
  if (request.object.get('partner')) {
    var query = new Parse.Query(Parse.User);
    console.log('User ' + request.object.get('email') + ' came in with partner ' + request.object.get('partner').id);
    query.get(request.object.get('partner').id, {
      success: function(partner) {
        if (partner.get('partner') && partner.get('partner').id === request.object.id) {
          if (!request.object.get('isPaired')) {
            console.log('Pairing ' + request.object.get('email') + ' with ' + partner.get('email'));
            request.object.set('isPaired', true);
            partner.set('isPaired', true);
            partner.save(null, {useMasterKey: true});
            response.success();
          } else {
            console.log('Users are already paired.');
            response.success();
          }
        } else if(request.object.isPaired) {
          console.log('User ' + request.object.get('email') + ' isPaired but has requested to partner with someone else.');
          request.object.set('isPaired', false);
          removePaired(request.object, function() {
            response.success();
          });
        } else {
          console.log('Partners are not the same. Do nothing');
          response.success();
        }
      },
      error: function(error) {
        console.error("Got an error " + error.code + " : " + error.message);
        response.success();
      },
      useMasterKey: true,
    });
  } else if (request.object.get('isPaired')) {
    request.object.set('isPaired', false);
    removePaired(request.object, function() {
      response.success();
    });
  } else {
    console.log('User has no partner and is not paired.');
    response.success();
  }
});
