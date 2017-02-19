
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
    partner.save();
  }).then(function() {
    console.log('Done updating users');
    callback();
  }, function(error) {
    console.error("Got an error " + error.code + " : " + error.message);
    callback();
  });
}

function getACL(user, partner, isAdd) {
  var acl = new Parse.ACL();
  acl.setReadAccess(user, true);
  acl.setWriteAccess(user, true);
  if (isAdd && partner) {
    acl.setReadAccess(partner, true);
  }
  return acl;
}

function manageResponseACL(user, partner, isAdd, callback) {
  var userObject = getQueryUserObject(user.id);

  var query = new Parse.Query('TestResponse');
  query.equalTo('user', userObject);
  query.each(function(response) {
    response.setACL(getACL(user, partner, isAdd));
    response.save();
  }).then(function() {
    console.log('Done updating ACL');
    callback();
  }, function(error) {
    console.error("Got an error " + error.code + " : " + error.message);
    callback();
  });
}

Parse.Cloud.beforeSave('TestResponse', function(request, response) {
  var currentUser = Parse.User.current();
  request.object.setACL(getACL(currentUser, currentUser.get('partner'), true));
  response.success();
});

Parse.Cloud.beforeSave(Parse.User, function(request, response) {
  Parse.Cloud.useMasterKey();

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
            partner.save();

            manageResponseACL(request.object, partner, true, response.success);
          } else {
            console.log('Users are already paired.');
            response.success();
          }
        } else if(request.object.isPaired) {
          console.log('User ' + request.object.get('email') + ' isPaired but has requested to partner with someone else.');
          request.object.set('isPaired', false);
          removePaired(request.object, function() {
            manageResponseACL(request.object, undefined, false, response.success);
          });
        } else {
          console.log('Partners are not the same. Do nothing');
          response.success();
        }
      },
      error: function(error) {
        console.error("Got an error " + error.code + " : " + error.message);
        response.success();
      }
    });
  } else if (request.object.get('isPaired')) {
    request.object.set('isPaired', false);
    removePaired(request.object, function() {
      manageResponseACL(request.object, undefined, false, response.success);
    });
  } else {
    console.log('User has no partner and is not paired.');
    response.success();
  }
});
