var g_activityFormSelectedActivityType = {};
var g_activityFormNewActivity = {};
var g_activityFormPhotoData = '';

function activityFormLoadIntoDiv(divSelector, canEdit) {
		
	$(divSelector).load('activityform.html', function() {
		
		if (canEdit) {
			
			var $divSave = $('<div class="divSave"><a id="saveActivityButton" class="activityCommandButton" data-theme="b" data-role="button" data-transition="none" data-icon="plus" data-iconpos="left" data-inline="true">' +
        	'Save</a><a id="cancelActivityButton" class="activityCommandButton" data-theme="c" data-role="button" data-transition="none" data-icon="minus" data-iconpos="left" data-inline="true">Cancel</a></div>');
		
			$(this).data('role') == 'popup' ? $divSave.prependTo(divSelector + ' form') : $divSave.appendTo(divSelector + ' form');
			
		}
		
		$(this).on('create', function() {
			
			var dao = new Dao();
			 dao.openDB(function() {activityFormInit(divSelector);});
		});
		
		$(this).trigger('create');
	});
}

function activityFormInit(divSelector) {
	
	$(divSelector + ' #activityFormPanel').hide();
	$(divSelector + ' #divContacts').hide();
	$(divSelector + ' #divDuedate').hide();
	$(divSelector + ' #divTime').hide();
	$(divSelector + ' #divData').hide();
	$(divSelector + ' #divListBoxType').hide();
	$(divSelector + ' #divNote').hide();
	$(divSelector + ' .divSave').hide();
	
	activityFormSetDateTimeToNow(divSelector);
	
	activityFormBind(divSelector);
}

function activityFormBind(parentDivSelector) {
	
	$('.divSave a').off();
	$('.divSave a').on('click', function() {
		
		('saveActivityButton' == this.id) ? activityFormSave() : activityFormHide();
	});

	$(parentDivSelector + ' #note').unbind();
 	$(parentDivSelector + ' #note').keypress(function (event) {
 		
 	    var keycode = (event.keyCode ? event.keyCode : event.which);
 	    
 	    if (keycode == '13') {
 	    	
 	    	event.preventDefault();
 	    	activityFormSave();
 	    }
 	});
	
	// PhoneGap
	if (g_canTakePhoto) {
		
		$(parentDivSelector + ' #activityPhotoButton').unbind();
		$(parentDivSelector + ' #activityPhotoButton').click(activityFormTakePhoto);
	}
}

function activityFormShowInPopup(activity, popupSelector) {
	
	onSuccess = function (activityType) {

		$(popupSelector).popup('open');	
		
		sessionStorage.setItem('currentActivity', JSON.stringify(activity));
		activityFormShow(activityType, popupSelector);
	};
	
	var dao = new Dao();
	dao.get('ActivityTypes', g_currentUser().SupplierID + activity.EventTypeID, onSuccess);
}

function activityFormShow(activityType, parentDivSelector) {
	
	g_activityFormParentDivSelector = parentDivSelector;
	
	var activity = sessionStorage.getItem('currentActivity') ? JSON.parse(sessionStorage.getItem('currentActivity')) : undefined;
	
	g_activityFormNewActivity = activity || {};
	
	activityFormBind(g_activityFormParentDivSelector);
	
	g_activityFormSelectedActivityType = activityType;
	
	$(g_activityFormParentDivSelector + ' .activityInfoPanel').hide();
	$(g_activityFormParentDivSelector + ' .activityTypeLabel').text(activityType.Label);
	
	$(g_activityFormParentDivSelector + ' #divDuedate').toggle(activityType.DueDateAllowed);
	$(g_activityFormParentDivSelector + ' #divTime').toggle(activityType.DueTimeAllowed);
	
	if (activityType.AllowContact) 
		activityFormFetchContacts(activity ? activity.ContactID : '');
	else
		$(g_activityFormParentDivSelector + ' #divContacts').hide();
    
	// PhoneGap
	
	$(g_activityFormParentDivSelector + ' #divPhoto').toggle(g_canTakePhoto && activityType.AllowPicture);
	
	if (g_canTakePhoto)
	    $(g_activityFormParentDivSelector + ' #activityPhotoButton').button().text('Take A Photo');	
	
	//field type
	switch (activityType.FieldType) {
	
		case 0:
			
			$(g_activityFormParentDivSelector + ' #divData').show();
			$(g_activityFormParentDivSelector + ' #divListBoxType').hide();
			$(g_activityFormParentDivSelector + ' #listBoxType').hide();
			$(g_activityFormParentDivSelector + ' #divNote').hide();
			break;
			
		case 1:
			
			$(g_activityFormParentDivSelector + ' #divData').hide();
			$(g_activityFormParentDivSelector + ' #divListBoxType').hide();
			$(g_activityFormParentDivSelector + ' #divNote').show();
			break;
			
		case 2:
			
			$(g_activityFormParentDivSelector + ' #divData').show();
			$(g_activityFormParentDivSelector + ' #divListBoxType').hide();
			$(g_activityFormParentDivSelector + ' #divNote').show();
			break;
			
		case 3:
			
			$(g_activityFormParentDivSelector + ' #divData').hide();
			$(g_activityFormParentDivSelector + ' #divListBoxType').hide();
			$(g_activityFormParentDivSelector + ' #divNote').hide();
			break;
			
		case 4:
			
			activityFormAddListBoxOptions();
			$(g_activityFormParentDivSelector + ' #divData').hide();		
			$(g_activityFormParentDivSelector + ' #divListBoxType').show();
			$(g_activityFormParentDivSelector + ' #fsListBox').controlgroup("refresh");
			$(g_activityFormParentDivSelector + ' #divNote').show();
	}		
	
	$(g_activityFormParentDivSelector + ' #divNumber').toggle(1 == activityType.FieldType);
	
	if (activity) {
		
		$(g_activityFormParentDivSelector + ' #note').val(activity.Notes);
		
		if ((0 == activityType.FieldType) || (2 == activityType.FieldType)) {
			
			$(g_activityFormParentDivSelector + ' #textType').val(activity.Data);
			
		} else if (1 == activityType.FieldType) {
			
			$(g_activityFormParentDivSelector + ' #number').val(activity.Data);
			
		} else if ((4 == activityType.FieldType) && activity.Data) {
			
			var optionArray = activity.Data.split(',');
			
			for ( var i = 0; i < optionArray.length; ++i) 
				$(g_activityFormParentDivSelector + ' #divListBoxType').find('input:checkbox[value=\'' + optionArray[i] + '\']').prop("checked", true).checkboxradio("refresh");
		}
		
		if (activityType.DueDateAllowed) {
			
			var date = new Date(parseInt(activity.DueDate.substring(6)));
			
		    var month = g_setLeadingZero(date.getMonth() + 1);               
		    var day = g_setLeadingZero(date.getDate());
		    
		    $(g_activityFormParentDivSelector + ' #duedate').val(date.getFullYear() + '-' + month + '-' + day);
		}
		
		if (activityType.DueTimeAllowed) {
			
			var date = new Date(parseInt(activity.DueDate.substring(6)) - parseInt(activity.EndDate.substring(6)));
			
		    var hours = g_setLeadingZero(date.getHours());
		    var minutes = g_setLeadingZero(date.getMinutes());
			
		    $(g_activityFormParentDivSelector + ' #time').val(hours + ':' + minutes);
		}
	}
	
	if (!$(g_activityFormParentDivSelector + ' #activityFormPanel .divSave').length)	
		$(g_activityFormParentDivSelector + ' #activityFormPanel').find(':input').attr('disabled', true);
	
	$(g_activityFormParentDivSelector + ' #activityFormPanel').find(':input:not(.canEdit)').attr('disabled', $(g_activityFormParentDivSelector + ' #activityFormPanel').parent().data('role') == 'popup');
	
	$(g_activityFormParentDivSelector + ' .divSave').show();
	$(g_activityFormParentDivSelector + ' #activityFormPanel').show();
}

function activityFormHide(parentDivSelector) {
	
	if (parentDivSelector)
		g_activityFormParentDivSelector = parentDivSelector;
	
	$(g_activityFormParentDivSelector + ' #textType').val('');
	
	if ($(g_activityFormParentDivSelector).data('role') == 'popup') {
		
		$(g_activityFormParentDivSelector).popup('close');
		return;
	}

	if (g_isScreenSmall()) {
	
		activityShowPanel(g_activityFormPanels.activityList);
	
	} else {
	
		$(g_activityFormParentDivSelector + ' #activityFormPanel').hide();
		$(g_activityFormParentDivSelector + ' .infoPanelText').html('Create your call report now by selecting<br>the desired activities on the left.');
		$(g_activityFormParentDivSelector + ' .activityInfoPanel').show();
	}
}

function activityFormRefresh() {
	
	$(g_activityFormParentDivSelector + ' form :input').each(function(){
	    formElements.push($(this));
	});
}

//PhoneGap
function activityFormTakePhoto() {
    var options = { quality: 50, targetWidth: 200, targetHeight: 200, destinationType: Camera.DestinationType.DATA_URL };
    try {
        if (DaoOptions.getValue('pictureoptions')){
                options = JSON.parse(DaoOptions.getValue('pictureoptions'));
                options.destinationType = Camera.DestinationType.DATA_URL;

        }		
    } catch (err){
        alert('Issue with pictureoptions option ' + DaoOptions.getValue('pictureoptions') + '<br/>' + err.message);
        options = { quality: 50, targetWidth: 200, targetHeight: 200, destinationType: Camera.DestinationType.DATA_URL };
    }

    try {
        navigator.camera.getPicture(activityFormTakePhotoOnSuccess, 
                        activityFormTakePhotoOnError, 
                        options);
    } catch (err){
            alert('Issue taking picture:' + err.message);
    }     
}

function activityFormTakePhotoOnSuccess(imageData) {
    
    g_activityFormPhotoData = imageData;
    $(g_activityFormParentDivSelector + ' #activityPhotoButton').button().text('Photo Taken - Click To Retake');
}


function activityFormTakePhotoOnError(errorMessage) {
    
    alert('Error:' + errorMessage);
}

function activityFormSave() {
    
    if (g_canTakePhoto && ($.trim(g_activityFormNewActivity.Label).match(/\*{2}$/)) && !g_activityFormPhotoData) {
        
        $('#activityErrorMessagePopup p').text('You must take a photo.');
        $('#activityErrorMessagePopup').popup('open');
        return;
    }
	
    $.mobile.showPageLoadingMsg();

    try {			
        if (!g_activityFormSelectedActivityType.DueDateAllowed) {			
                activityFormSetDateTimeToNow();
                $(g_activityFormParentDivSelector + ' #duration').val(30);
                var now = moment();
                g_activityFormNewActivity.DueDate = now.toDate();
                now.add('h',1);
                g_activityFormNewActivity.EndDate = now.toDate();
        } else {
                var mom = new moment($(g_activityFormParentDivSelector + ' #duedate').val() + $(g_activityFormParentDivSelector + ' #time').val(), "YYYY-MM-DD HH:mm");
                var now = mom.toDate();
                now.setHours(now.getHours() - now.getTimezoneOffset() / 60);
                g_activityFormNewActivity.DueDate = now;
                var mom2 = new moment(now);
                mom2.add('hours', 1); //$("#duration").val());
                g_activityFormNewActivity.EndDate = mom2.toDate(); //new Date(g_activityFormNewActivity.DueDate.getTime() + $("#duration").val() * 60 * 1000); 				
        }

        g_activityFormNewActivity.EventID = g_activityFormNewActivity.EventID || createId();
        g_activityFormNewActivity.Deleted = false;
        g_activityFormNewActivity.EventTypeID = g_activityFormSelectedActivityType.EventID;
        g_activityFormNewActivity.AccountID = g_currentCompany().AccountID;
        g_activityFormNewActivity.SupplierID = g_currentCompany().SupplierID;
        g_activityFormNewActivity.Notes = $(g_activityFormParentDivSelector + ' #note').val();
        g_activityFormNewActivity.UserID = g_currentUser().UserID;		
        g_activityFormNewActivity.key = g_currentCompany().SupplierID + g_currentCompany().AccountID + g_activityFormNewActivity.EventID;

        if ((1 == g_activityFormSelectedActivityType.FieldType) && (!$.isNumeric($(g_activityFormParentDivSelector + ' #number').val()))) {

            g_alert("Please enter numeric data.");
            $.mobile.hidePageLoadingMsg();
                return;
        }

        if (g_activityFormSelectedActivityType.FieldType == 0)
                g_activityFormNewActivity.Data = $(g_activityFormParentDivSelector + ' #textType').val();

        else if (g_activityFormSelectedActivityType.FieldType == 1)
                g_activityFormNewActivity.Data = $(g_activityFormParentDivSelector + ' #number').val();	

        else if (4 == g_activityFormSelectedActivityType.FieldType) {

                var data = [];			
                $(g_activityFormParentDivSelector + ' input:checkbox[name=datachoice]:checked').each(function() {
                        data.push($(this).val());
                });

                if (!data.length) {

                    g_alert("You need to select an option.");
                    $.mobile.hidePageLoadingMsg();
                        return;					
                }

                g_activityFormNewActivity.Data = data.toString();
        }

        if (g_activityFormSelectedActivityType.AllowContact) {
                g_activityFormNewActivity.ContactID = $(g_activityFormParentDivSelector + ' input:radio[name=contactchoice]:checked').val();
        }

        if (g_activityFormSelectedActivityType.AllowGPS)		
                navigator.geolocation ? navigator.geolocation.getCurrentPosition(activityFormSavePosition, activityFormOnPositionError, {timeout:10000}) : g_alert("ERROR: GPS is not supported on your device.");
        else
                activityFormSaveStep2();


    } catch (err) {	

            $.mobile.hidePageLoadingMsg();
        g_alert('Error saving activity:' + err.message);
            return;
    }	
}



function activityFormSaveStep2() {
    //if we have required activities, then remove this one from the list
    if (sessionStorage.getItem('RequiredActivities')){
        var requiredactivities = sessionStorage.getItem('RequiredActivities');
        var newreq = requiredactivities.replace(g_activityFormNewActivity.EventTypeID + ',','' );
        if (newreq==='')
            sessionStorage.removeItem('RequiredActivities');
        else
            sessionStorage.setItem('RequiredActivities',newreq);
    }

    //shaun - always save image offline
    if (g_canTakePhoto) {
            //alert('saving');
        var image = new Object();

        image.Id = g_activityFormNewActivity.EventID;
        image.SupplierID = g_activityFormNewActivity.SupplierID;
        image.FileData = g_activityFormPhotoData;

        image.Type = 'image/jpeg;base64';
        image.Name = image.Id + '.jpg';

        g_saveObjectForSync(image, image.Id, 'File', 'UploadImage');
    }

    if (g_isOnline(false)) {
    try {		
            var activityInfo = {};  
            activityInfo.Table = "Activities";
            activityInfo.Method = "Modify";
            activityInfo.json = JSON.stringify(g_activityFormNewActivity); 
            var onSuccess = function() {
                    console.log('Activity saved online.');
                    activityFormOnSaveSuccess();
            };

            var onFailure = function(error) {
                    activityFormSaveOffline();
                    //((error.status == 0) || (error.status == 200)) ? onSuccess() : activityFormSaveOffline();
            };

            g_ajaxpost(jQuery.param(activityInfo), g_restUrl + 'post/post.aspx', onSuccess, onFailure);  
    } catch (error) {
            activityFormSaveOffline();   		
    } 

    } else {
            activityFormSaveOffline();
    }
}

function activityFormSavePosition(position) {
	
	g_activityFormNewActivity.Latitude = position.coords.latitude;
	g_activityFormNewActivity.Longitude = position.coords.longitude;
	activityFormSaveStep2();
}


function activityFormOnPositionError(error) {
	
	$.mobile.hidePageLoadingMsg();
	
	if(error.code == 1)
		g_alert("Error: Access to GPS position is denied.");
	else if( error.code == 2)
	    g_alert("Error: Position is unavailable.");
	
	activityFormSaveStep2();
}

function activityFormSaveOffline() {
	
	g_saveObjectForSync(g_activityFormNewActivity, g_activityFormNewActivity.key, "Activities", "Modify", undefined);
	
	if (g_canTakePhoto) {
		
	    var image = new Object();
	    
	    image.Id = g_activityFormNewActivity.EventID;
	    image.SupplierID = g_activityFormNewActivity.SupplierID;
	    image.FileData = g_activityFormPhotoData;
	    
	    image.Type = 'image/jpeg;base64';
	    image.Name = image.Id + '.jpg';
	    
	    g_saveObjectForSync(image, image.Id, 'File', 'UploadImage');
	}
	
	activityFormOnSaveSuccess();
}

function activityFormOnSaveSuccess() {
	
    $.mobile.hidePageLoadingMsg();

    g_markCustomerAsVisited(g_activityFormNewActivity.AccountID);

    sessionStorage.setItem('HistoryCacheAccountID', '');
    sessionStorage.removeItem('CacheHistoryActivities');
    sessionStorage.removeItem('CacheHistoryOrders');

    $(g_activityFormParentDivSelector + ' #textType').val('');

    if ($(g_activityFormParentDivSelector).data('role') == 'popup') {

            sessionStorage.setItem('activitySavedItems', JSON.stringify({Data: g_activityFormNewActivity.Data, Notes: g_activityFormNewActivity.Notes}));

            $(g_activityFormParentDivSelector).popup('close');
            return;
    }

    if (g_isScreenSmall()) {

            g_alert('The activity is saved.');
            activityShowPanel(g_activityFormPanels.activityList);

    } else {

            $(g_activityFormParentDivSelector + ' .infoPanelText').html('<b>Activity saved OK.</b> Create another<br>by selecting another activity on the left.');
            $(g_activityFormParentDivSelector + ' #activityFormPanel').hide();
            $(g_activityFormParentDivSelector + ' .activityInfoPanel').fadeIn();
    }
    
    g_activitySavedActivities[g_activityFormNewActivity.EventTypeID] = 'Saved';
}


function activityFormAddListBoxOptions() {
	
   	$(g_activityFormParentDivSelector + ' #divListBoxType fieldset input').remove();
	$(g_activityFormParentDivSelector + ' #divListBoxType fieldset label').remove();
	var options = g_activityFormSelectedActivityType.DefaultData.split(',');
	
	var disabled = ($(g_activityFormParentDivSelector + ' #activityFormPanel').parent().data('role') == 'popup') ? 'disabled' : '';
	
	for (var i = 0; i < options.length; i++) {
		
	    g_append(g_activityFormParentDivSelector + ' #divListBoxType fieldset', '<input id="option' + i + '" name="datachoice" value="' +
											 options[i] + '" type="checkbox"' + disabled + '>' +
											 '<label for="option' + i + '">' + options[i] + '</label>');
	    
		$(g_activityFormParentDivSelector + ' #option' + i).checkboxradio().checkboxradio("refresh");
	}
}


/*
 * fetch contacts and build the radio buttons
 */
function activityFormFetchContacts(selectContactID) {	
	
   	$(g_activityFormParentDivSelector + ' #divContacts fieldset input').remove();
	$(g_activityFormParentDivSelector + ' #divContacts fieldset label').remove();
	$(g_activityFormParentDivSelector + ' #lblContact').hide();
	
    var dao = new Dao();
    dao.cursor('Contacts', undefined, undefined,
    		function (contact) {
		        if (contact.AccountID == g_currentCompany().AccountID && contact.SupplierID.toLowerCase() == g_currentCompany().SupplierID.toLowerCase()) {

		        	var checked = (selectContactID == contact.Counter) ? 'checked' : '';
		        	var disabled = ($(g_activityFormParentDivSelector + ' #activityFormPanel').parent().data('role') == 'popup') ? 'disabled' : '';
		        	
		            g_append(g_activityFormParentDivSelector + ' #divContacts fieldset', '<input id="' + contact.Counter + '" name="contactchoice" value="' + contact.Counter + '" type="radio" ' + checked + ' ' + disabled + '>' +
		                							 '<label for="' + contact.Counter + '">' + contact.Name + '</label>');
		        	$(g_activityFormParentDivSelector + ' #' + contact.Counter).checkboxradio().checkboxradio("refresh");
		        }
		    },
		    undefined,
		    function (event) {  
		    	$(g_activityFormParentDivSelector + ' #divContacts').show();
		    	$(g_activityFormParentDivSelector + ' #fsContacts').controlgroup("refresh");
		    });    
}

function activityFormSetDateTimeToNow(parentDivSelector) {

    var now = new Date();
    
    var month = g_setLeadingZero(now.getMonth() + 1);               
    var day = g_setLeadingZero(now.getDate());
    
    $(parentDivSelector + ' #duedate').val(now.getFullYear() + '-' + month + '-' + day);
    
    var hours = g_setLeadingZero(now.getHours());
    var minutes = g_setLeadingZero(now.getMinutes());
	
    $(parentDivSelector + ' #time').val(hours + ':' + minutes);
}