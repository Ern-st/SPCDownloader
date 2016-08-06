//Seagate Personal Cloud API
//Author @ern_st
//requirements: jQuery, sha1.js
var spcAPI = {
	options: {
		username: null, //plaintet username
		password: null, //hex_sha1() encoded password
		host: "nas.local"
	},
	actions: {
		addDownload: "/api/external/7.0/download.DownloadAdministration.add",
		listDownloads: "/api/external/7.0/download.DownloadAdministration.list",
		deleteDownload: "/api/external/7.0/download.DownloadAdministration.delete",
		healthState: "/api/external/7.0/hw_monitoring.Administration.health_state",
		enumerateFolder: "/api/external/7.0/filebrowser.FileBrowsing.enumerate_folder"
	},
	callAPI_prehook: function(){return true},
	callAPI: function(action, payload){
		if(!this.callAPI_prehook(action,payload)){
			return $.Deferred().reject({reason:"API call rejected by prehook validation"});
		};
		path = this.actions[action];
		timestamp = new Date().toUTCString();
		payload = JSON.stringify(payload);

		authPayload = 'POST ' + path + '\n' + 'Date: ' + timestamp + '\n' + payload;
		authUser = btoa(this.options.username);
		authPayload = binb2b64(core_hmac_sha1(this.options.password,authPayload));

		return $.ajax( 
			"http://" + this.options.host + path,{
				type: "POST",
				beforeSend: function (xhr) {
			        xhr.setRequestHeader('AUTHENTICATION', "HMAC-SHA1-DATE " + authUser + ":" + authPayload);
			        xhr.setRequestHeader("DATE-AUTH", timestamp);
			        xhr.setRequestHeader("Language-Code","en");
			    },
			    data: payload	
			}
		)
	},
	listDownloads: function(status, limit = -1, offset = 0){
		return this.callAPI(
			"listDownloads",
			{"with_parameters":{"__type__":"List", "__sub_type__":"Unicode", "__elements__":[]}, "list_info":{"__type__":"ListInfo", "__properties__":{"limit":limit, "order":{"__type__":"Ordering", "__properties__":{"asc":true, "order_by":"status"}}, "search_parameters":{"__type__":"Dict", "__sub_type__":"Unicode", "__elements__":{status:status}}, "offset":offset}}}
		);
	}
};