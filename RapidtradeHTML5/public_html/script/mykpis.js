function myKPIsOnPageShow() {
    
    $('.headerLogo').attr('src', g_logo);
	
    myKPIsInit();
    myKPISBind();
}
function myKPISBind() {
    $('#mykpistimenu').button()
  .click(function (event) {

      g_loadMenu();
  });
}
function myKPIsInit() {
	
	$.mobile.showPageLoadingMsg();
	$("#weeklyReport").empty();
	myKPIsFetch();
}

function myKPIsFetch() {
	
    var date = new Date();
    var startDate = date.getFullYear() + "-" + g_setLeadingZero((date.getMonth() + 1)) + "-" + g_setLeadingZero(date.getDate());
    var url = g_restUrl + "KPI2/GetActuals2?supplierID=" + g_currentUser().SupplierID + "&userID=" + g_currentUser().UserID + "&startdate=" + startDate + "&format=json";
    var success = function (json) {

        $.each(json.WeeklyInfo, function (i, item) {
            g_append('#weeklyReport', myKPIsRowHtml(item, ['CurrentWeek', 'Week_1', 'Week_2', 'Week_3']));
            //$('#weeklyReport').append(myKPIsRowHtml(item, ['CurrentWeek', 'Week_1', 'Week_2', 'Week_3']));
        });

        $.each(json.MonthlyInfo, function (i, item) {
            g_append('#monthlyReport', myKPIsRowHtml(item, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']));
            //$('#monthlyReport').append(myKPIsRowHtml(item, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']));
        });

        $('.hidden').removeClass('hidden');
        $("#weeklyReport, #monthlyReport").listview('refresh');
        $("#loadingPanel").hide();
        $("#weeklyReport, #monthlyReport").fadeIn();
        $.mobile.hidePageLoadingMsg();
    }
    var error = function (e) {
        console.log(e.message);
    }

    g_ajaxget(url, success, error);
    //$.ajax({
    //    type: 'GET', url: url, async: false, jsonpCallback: 'jsonCallback2', contentType: "application/json", dataType: 'jsonp',
    //    success: function (json) {
        	
    //    	$.each(json.WeeklyInfo, function (i, item) {
    //        	$('#weeklyReport').append(myKPIsRowHtml(item, ['CurrentWeek', 'Week_1', 'Week_2', 'Week_3']));        		
    //    	}); 
        	
    //    	$.each(json.MonthlyInfo, function (i, item) {
    //    		$('#monthlyReport').append(myKPIsRowHtml(item, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']));
    //    	});

    //        $('.hidden').removeClass('hidden');
    //        $("#weeklyReport, #monthlyReport").listview('refresh');
    //        $("#loadingPanel").hide();
    //        $("#weeklyReport, #monthlyReport").fadeIn();
    //        $.mobile.hidePageLoadingMsg();
    //    },
    //    error: function (e) {
    //        console.log(e.message);
    //    }
    //});	
}

function myKPIsRowHtml(item, columns) {
	
	var html = 	'<li><table class="mykpis"><tr>' +
				'<td class="type">'+ item.Description + '</td>' +
				'<td class="value">'+ myKPIsFormat(item.KPIValue) + '</td>';
	
	for (var i = 0; i < columns.length; ++i)
		html += '<td class="total ' + ((item[columns[i]] < item.KPIValue) ? 'red' : (item[columns[i]] > item.KPIValue) ? 'green' : 'yellow') + '">' + myKPIsFormat(item[columns[i]]) + '</td>';
	
    html += '</tr></table></li>';
	
	return html;
}

 function myKPIsFormat(number) {
	 
	 if (!number)
		 return 0;
	 
    while (/(\d+)(\d{3})/.test(number.toString()))
    	number = number.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');

    return number;
 }

