//track password & destinations
var track = {
  password: null,
  destinations: []
};

var statusElm = {
  elm: $('#status'),
  set: function(msg, classVal = "", hide = false, hideDelay = 1000){
    if (hide) {
      setTimeout(function(that) {
        that.elm.attr("data-show","false");
      }, hideDelay, this);
    } else if (this.elm.attr("data-show") === "false") {
      this.elm.attr("data-show","true");
      console.log("showing status elm");
    }
    if (!(this.elm.html() === msg)) {
      this.elm.html(msg)
      console.log(msg);
      this.elm.attr("class",classVal);
    }
  }
};

function validate_destinations(destinations){
  var deferredAPIcalls = [];
  for (var i = destinations.length - 1; i >= 0; i--) {
    $deferred = $.Deferred();
    deferredAPIcalls.push($deferred);
    spcAPI.callAPI("enumeRateFolder",{"folder_id":destinations[i],"list_info":{"__type__":"ListInfo","__properties__":{"limit":-1,"search_parameters":{"__type__":"Dict","__sub_type__":"Unicode","__elements__":{"folder_only":"true"}},"offset":0}}}).fail(function(data){
      
    }).always($deferred.resolve);
  }
  $.when.apply($, deferredAPIcalls).done(function(){
    showNotification({
      icon: "assets/img/delete.png",
      title: "success", 
      body: "All finished downloads have been cleared.\nNow you Queue is as clean as a "+silly[Math.floor(Math.random() * silly.length)]
    });
  });
}

function save_options() {
  var username = $('#username').val();
  var password = $('#password').val() === track.password ? track.password : hex_sha1($('#password').val());
  var host = $('#host').val();
  var destinations = $("#destinations").val().split("\n").reverse();
  statusElm.set("Validating options<span>.</span><span>.</span><span>.</span>");
  if (destinations[0] === "") {
    statusElm.set("You need to specify some Download locations before you can save the options.","fail",true,3000);
    return false;
  }
  spcAPI.options = {
    username: username,
    password: password,
    host: host
  };
  spcAPI.callAPI("healthState",{}).done(function(){
    chrome.storage.sync.set({
      username: username,
      password: password,
      host: host,
      destinations: destinations
    }, function() {
      statusElm.set("options saved.","success",true);
    });
  }).fail(function(res){
    switch(res.status){
      case 401:
        if (res.responseJSON["text"] === "Ip blocked") {
          var msg = "Too many failed logins attempts, try again in 15 seconds."
        } else {
          var msg = 'Wrong username or password! options were not saved.';
        }
        break;
      case 0:
        var msg = 'Hostname/IP could not be contacted! Maybe the NAS is powered off? options were not saved.';
        break;
      default:
        var msg = 'There was a problem Validating the options! options were not saved.';
    }
    statusElm.set(msg,"fail",true,3000);
  });
}

function restore_options() {
  chrome.storage.sync.get({
    username: null,
    password: null,
    host: "nas.local",
    destinations: []
  }, function(items) {
    $('#username').val(items.username);
    $('#password').val(items.password);
    $('#host').val(items.host);
    $('#destinations').val(items.destinations.reverse().join("\n"));
    track.password = items.password;
    track.destinations = items.destinations;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
$('#save').click(save_options);
