/*
 * variables
 */
var g_activityPanels = {'activityList': 0, 'activityDetails':1};
var g_activitySavedActivities = {};


/**
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */

function activityOnPageShow() {  

	activityOnPageShowSmall();
	overlaySetMenuItems();
	
	activityFormHide('#activitydetails');
	
	g_showCurrentCompanyName();
	
	var dao = new Dao();
	dao.openDB(function (user) { activityInit(); });
}

function activityOnPageShowSmall() {
	
	if (g_isScreenSmall()) {
		
		$('.hideonphone').hide();
	}	
} 

/*
 * initial function called
 */

function activityInit() {

    activityFetchActivityTypes();
}

/*
 * fetch activity types from local database
 */

function activityFetchActivityTypes() {
	
	var dao = new Dao();
	$('#activitytypelist').empty();
	
	dao.cursor('ActivityTypes',undefined, undefined,
            function(activityType) {
                
                var accountGroups = activityType.ForAccntGrp.split(',');                                

                if (($.inArray(g_currentCompany().AccountGroup, accountGroups) !== -1) && !activityType.Deleted) {

                    g_append('#activitytypelist', '<li data-theme="c"><a href="#" data-transition="none">' + activityType.Label + '</a></li>');

                        $( '#activitytypelist li:last' ).click(function(event) {
                            
                            activityTypeOnClick(activityType);	
                        }); 
                    }
            },
            undefined,
            function(event) {
                $('#activitytypelist').listview('refresh');

            });
}

/*
 * Run when an activity is clicked on
 */

function activityTypeOnClick(activityType) {
	
	$('#activityH1').text(activityType.Label);
	
	activityFormShow(activityType, '#activitydetails');
	
	if (g_isScreenSmall()) {
		
		activityShowPanel(g_activityPanels.activityDetails);
	}
}

function activityShowPanel(activityPanel) {
	
	$('#activitylist').toggle(g_activityPanels.activityList == activityPanel);	
	$('#activitydetails').toggle(g_activityPanels.activityDetails == activityPanel);
}
