var g_todayPageTranslation = {};

function todayOnPageBeforeCreate() {
    
    g_todayPageTranslation = translation('todaypage');
}

function todayOnPageShow() {
    
    g_todayPageTranslation.safeExecute(function() {
        
        g_todayPageTranslation.translateButton('.ui-btn-right', 'Refresh');
    });
	
    g_iPadBar('#todaypage');

    var dao = new Dao();
    dao.openDB(function (user) { todayInit(); });
    todayBind();

    if (!DaoOptions.get('TodayActivityList')) {

            $('#todaypage div.ui-grid-a').removeClass('ui-grid-a').addClass('ui-grid-solo');
            $('#todaypage div.ui-block-b').hide();

    } else {

            var onSuccess = function(activity) {

                    $('.activityLabel').text(activity.Label);
            };

            var dao = new Dao();
            dao.get('ActivityTypes', g_currentUser().SupplierID + DaoOptions.getValue('TodayActivityList'), onSuccess);
    }
}

function todayBind() {
	
	$('#todayHeader').on('click', 'a', function() {
		
		'todayToMenu' == this.id ? g_loadMenu() : todayRefresh();
	});
}

function todayInit() {
	
	todayFetchCallCycle();
	
	if (DaoOptions.get('TodayActivityList')) {
		
		todayFetchActivities();
	}
}

function todayRefresh() {
	
	sessionStorage.removeItem('activityCustomers');
	todayFetchActivities();
}

/*
 * fetch call cycle for today
 */
function todayFetchCallCycle(){	
		
	var dao = new Dao();
	$('#customerlist').empty();
	
	dao.cursor('CallCycle', undefined, undefined,
			
            function(customerInfo) {
		
                var status = customerInfo[todayGetCurrentDay()];

                if ((customerInfo.Week == g_currentCallCycleWeek()) && status) {

                    g_append('#customerlist', '<li data-theme="c" id="' + customerInfo.AccountID + '">' +
                    '<a onclick="todayOnCustomerClick(\'' + customerInfo.AccountID + '\')" data-transition="none">' +
                    todayShowImage(g_isCustomerVisited(customerInfo.AccountID)) +
                    customerInfo.Name +
                    '</a>' +
                    '</li>');  
		}
            },
				
            undefined,

            function(event) {

                    if ($('#customerlist li').length > 0)
                            $('#customerlist').listview('refresh');
                    else
                            $('#noCallCycleDiv').removeClass('hidden');
            });
}

function todayFetchActivities() {
	
	if (sessionStorage.getItem('activityCustomers')) {
		
		todayShowActivities(JSON.parse(sessionStorage.getItem('activityCustomers')));		
				
	} else {
		
		$.mobile.showPageLoadingMsg();
	
		var url = g_restUrl + 'Activities2/GetCollection2?supplierID=' + g_currentUser().SupplierID + '&userID=' + g_currentUser().UserID + 
								'&includeReps=false&activityTypes=' + DaoOptions.getValue('TodayActivityList') + '&fromDate=' + moment().format('YYYYMMDD') + '&toDate=' + moment().add('days', 1).format('YYYYMMDD') + '&skip=0&top=300&format=json';
		
		g_ajaxget(url, todayShowActivities);
	}
}

function todayShowActivities(json) {
	
	$('#activityCustomerList').empty();
	
	var length = json.length;
	
	for (var i = 0; i < length; i++) {
		
        g_append('#activityCustomerList', '<li data-theme="c" id="' + json[i].AccountID + '">' +
                '<a onclick="todayOnCustomerClick(\'' + json[i].AccountID + '\')" data-transition="none">' +
                todayShowImage(g_isCustomerVisited(json[i].AccountID)) +
                json[i].Description + ' (' + json[i].Data + ', ' + json[i].Notes + ')' +
                '</a>' +
            '</li>'); 
	}
	
	if (length) {
		
		$('#activityCustomerList').listview('refresh');
		sessionStorage.setItem('activityCustomers', JSON.stringify(json));		
		
	} else {
		
		$('#noActivityDiv').removeClass('hidden');
	}
	
	$.mobile.hidePageLoadingMsg();
}

function todayOnCustomerClick(accountId){
	
	var dao = new Dao();
	
	dao.index('Companies', accountId, 'AccountID', 
			
			function(company) {
		
				sessionStorage.setItem('companyBack',"today.html");
				sessionStorage.setItem('currentCompany',JSON.stringify(company)); //store for other pages
				$.mobile.changePage('company.html', { transition: "none"}); 
	});
}


function todayShowImage(status) {
	
    return '<img class="ui-li-icon" src="img/' + (status ? 'Select' : 'Cancel2') + '-32.png"/>';
}

function todayGetCurrentDay() {
    
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var date = new Date();
    return days[date.getDay()];
}