
var smp = (function(){
    
    var instance;	      
    function instanceObj() {
        
        this.onComplete = '';
        this.user = '';
        this.account = ''; 
        this.tpms = [];
        this.result;
        
        this.getUser = function(){
            return this.result.registrationContext;
        };
        
        this.logoff = function(onComplete, onError){
            sap.logon.deletePasscodeManager(onComplete, onError);
        };
        
        this.logon = function (onNotify, onComplete) { 	
            var logonSuccess = function(result){
                applicationContext = result;
                smp.getInstance().result = result;
                onComplete(result.registrationContext.user); 	
            };  

            var logonError = function(){
                alert('Could not log you in');
            };  

            if (sap.Logger) {
                sap.Logger.setLogLevel(sap.Logger.DEBUG);  //enables the display of debug log messages from the Kapsel plugins.
                sap.Logger.debug("Log level set to DEBUG");
            }

            var appId = "com.rapidtrade.RapidTradeIPad";
            var defaultContext = {
                                    "serverHost" : "54.208.63.203",
                                    "https" : "false",
                                    "serverPort" : "8080",
                                    "user":"shaun",
                                    "communicatorId":"REST"
                                  };
            // AppUpdate 
            window.onerror = onError;            
            function onError(msg, url, line) {
                if (!url) { 
                     console.log("An unknown error occurred");
                     onNotify("An unknown error occurred");
                     return false;
                }
                var idx = url.lastIndexOf("/"); 
                var file = "unknown";
                if (idx > -1) {
                    file = url.substring(idx + 1);
                }
                alert("An error occurred in " + file + " (at line # " + line + "): " + msg);
                var r =  confirm("Check to see if an update is available?");
                if (r == true) {
                    sap.Logon.init(function() { }, function() { alert("Logon Failed"); }, "com.mycompany.appupdate");
                    sap.AppUpdate.update();
                }          

                return false; //suppressErrorAlert;
            };      

            sap.AppUpdate.addEventListener("checking", function(e) {
                onNotify("Checking for update");
                console.log("Checking for update");
            });

            sap.AppUpdate.addEventListener("noupdate", function(e) {
                onNotify("App up to date");
                console.log("No update");
            });

            sap.AppUpdate.addEventListener("downloading", function(e) {
                onNotify("Downloading update");
                console.log("Downloading update");
            });



            //SP02 New Feature
            sap.AppUpdate.addEventListener("progress", function(e) {
                if (e.lengthComputable) {
                    var percent = Math.round(e.loaded / e.total * 100);
                    onNotify("Download progress " + percent + "%");
                    console.log("Progress " + percent);
                    //document.getElementById('statusLabel').innerHTML = "Download progress " + percent + "%";
                }
            });      

            sap.AppUpdate.addEventListener("error", function(e) {
                onNotify("Error downloading update. statusCode: " + e.statusCode + " statusMessage: " + e.statusMessage);
                console.log("Error downloading update. statusCode: " + e.statusCode + " statusMessage: " + e.statusMessage);
            });      

            /*  //Notice that addEventListener adds the function to the chain of functions that are notified. 
             sap.AppUpdate.addEventListener("updateready", function(e) {
                 console.log("Update ready");
             });

             */
             //Notice here that we are overriding the default handler for the updateready event
            sap.AppUpdate.onupdateready = function() {
                console.log("Confirming application update");
                document.getElementById('statusLabel').innerHTML = "";
                navigator.notification.confirm("New update available",
                    function(buttonIndex) {
                        if (buttonIndex === 2) {
                                onNotify("Applying application update");
                            console.log("Applying application update");
                            sap.AppUpdate.reloadApp();
                        } 
                    }, 
                    "Update", ["Later", "Relaunch Now"]);
            };

            //alert('trying 2');
            try {
                onNotify('Logging in to SAP');
                console.log('calling sap');
                sap.Logon.init(logonSuccess, logonError, appId, defaultContext);
                //sap.AppUpdate.update();
            } catch (err){
                alert (err.message);
            }           
        } 
    };      
    
    return {
        getInstance: function(){
              if(!instance){
                  instance = new instanceObj; 
              }
              return instance; 
        }
    };	
})();    
