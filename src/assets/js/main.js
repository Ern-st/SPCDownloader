//thanks to http://www.castro.aus.net/~maurice/OddsAndEnds/resources/health_check.py
spcAPI.options = {
	username: null,
	password: null,
	host: "nas.local",
	destinations: [
		// "/Public/Videos/TV",
		// "/Public/Videos/Movies",
		// "/jeppe/Downloads"
	]
};
var notificationTimeout = 10000;

chrome.storage.sync.get(function(items) {
	spcAPI.options.username = items.username;
	spcAPI.options.password = items.password;
	spcAPI.options.host = items.host;
	//spcAPI.options.destinations = items.destinations;
	buildContextMenu(spcAPI.options.destinations = items.destinations);
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
	for (key in changes) {
		spcAPI.options[key] = changes[key].newValue;
		console.log(key+" was changed to "+changes[key].newValue);
		if (key === "destinations") {
			buildContextMenu(spcAPI.options.destinations);
		}
	}
});

spcAPI.callAPI_prehook = function(){
	if (this.options["prehookcalled"]) {
		return false;
	} else if (this.options.username === undefined || this.options.password === undefined) {
		showNotification({
			icon: "assets/img/fail.png",
			title: "No login credentials configured!", 
			body: "You need to specify username & password in the plugin options first."
		});
		chrome.runtime.openOptionsPage();
		this.options.prehookcalled = true;
		setTimeout(function(that){
			that.options.prehookcalled = false;
		},notificationTimeout,this);
		return false;
	} else {
		return true;
	}
}

var silly = ["cat","Canary in a coalmine","<Allan: insert something funny here!>"];

function clearFinishedDownloads(){
	var torrents = spcAPI.listDownloads(8);
	var downloads = spcAPI.listDownloads(11);

	$.when(torrents, downloads).done(function(torrentsData, downloadsData){
			var deferredAPIcalls = [];
			var elements = torrentsData[0].download_list.__elements__.concat(downloadsData[0].download_list.__elements__);
			if (elements.length === 0) {
				showNotification({
					icon: "assets/img/delete.png",
					title: "Well that was easy :D", 
					body: "There were no downloads to clear..."
				});
			} else {
				for (var i = elements.length - 1; i >= 0; i--) {
					//elements[i]
					$deferred = $.Deferred();
					deferredAPIcalls.push($deferred);
					spcAPI.callAPI("deleteDownload",{"download_id":elements[i].__properties__.id}).fail(function(data){
						showNotification({
							icon: "assets/img/fail.png",
							title: "FAIL!", 
							body: "failed to clear "+elements[i].__properties__.name+"\nerror:"+data
						});
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
		});
}

function addDownload(link,dest_path){
	spcAPI.callAPI("addDownload", {
		"token_or_dl_link":link, 
		"dest_path":dest_path
	}).done(function(data){
		showNotification({
			icon: "assets/img/success.png",
			title: "success", 
			body: data.downlad.__properties__.name + " was added to " + data.downlad.__properties__.dest_path
		});
	}).fail(function(data){
		if (data.reason != undefined) {
			console.warn(reason);
			return false;
		}
		showNotification({
			icon: "assets/img/fail.png",
			title: "FAIL!", 
			body: data.responseJSON.text
		});
	});
}

function showNotification(data){
	var notify = new Notification(data.title, {
			icon: data.icon,
		    body: data.body
		  });
	setTimeout(function(notification){
		notification.close();
	},notificationTimeout,notify);
	return notify;
}

function buildContextMenu(downloadLocations){
	//clean up
	chrome.contextMenus.removeAll();
	//Dynamically build download links for context menu
	var downloadFunction = [];
	var downloadMenuID = {};
	for (var i = downloadLocations.length - 1; i >= 0; i--) {
		downloadFunction[i] = function(obj){
			dlPath = downloadMenuID[obj.menuItemId];
			if (obj.linkUrl) {
				addDownload(obj.linkUrl,dlPath);
			} else if (obj.srcUrl) {
				addDownload(obj.srcUrl,dlPath);
			}
		}
		var menuID = chrome.contextMenus.create({
		  title: "Download to \""+downloadLocations[i]+"\"",
		  contexts:["link","video"],
		  onclick: downloadFunction[i]
		});
		//save the location so we can deduce it from the menuitemid
		downloadMenuID[menuID] = downloadLocations[i];
	}
	if (downloadLocations.length === 0) {
		var openOptionsPage = function(){
			chrome.runtime.openOptionsPage();
		}
		chrome.contextMenus.create({
			title: "Setup download destinations",
			contexts: ["link","video"],
			onclick: openOptionsPage
		});
	}
	//add button to clear all downloads
	chrome.contextMenus.create({
		title: "Clear all finished downloads",
		contexts: ["browser_action"],
		onclick: clearFinishedDownloads
	});
}