var route = (function() {
    
    // Public
    
    /*
     * route.init();
     */
    
    return {
        
        init: function() {
            
            bind();
            $('#selectRoutePopup').popup('open');
        }
    }
    
    // Private     
    
    function bind() {
        
        $('#routeToMenu').off().on('click', g_loadMenu);
        $('#submit').off().on('click', fetchRoutes);       
    }
    
    function fetchRoutes() {
        
        g_busy(true);
        
        var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_route_UnsentCount&params=(%27' + g_currentUser().SupplierID + '%27|%27' + g_currentUser().UserID + '%27|%27' + selectedDate() + '%27)';
        
        // TEST
//        url = 'http://107.21.55.154/rest/index.php/GetStoredProc?StoredProc=usp_route_UnsentCount&params=(%27justsqueezed%27|%27FTP-100%27|%2720141106%27)';
        
        console.log(url);
        g_ajaxget(url, showRoutes);
    }
    
    function showRoutes(routes) {
        
        if (!routes.length) {
            
            g_busy(false);
            $('#routeList').empty();
            return;
        }
        
        var routeListHtml = '';
        
        var routeNumbers = {}, addedRows = 0;
        
        $.each(routes, function(index, route) {      
            
            route.routeID = $.trim(route.routeID);
            routeNumbers[route.routeID] = route.numOfRouts;
            
            var dao = new Dao();
            dao.get('Route', route.routeID, function(item) {
                
                item.routeID = $.trim(item.routeID);
                
                routeListHtml += '<li data-theme="c" id="' + item.routeID + '"><a href>' + item.Name + '(' + routeNumbers[item.routeID] + ')</a></li>';
                
                if (++addedRows === routes.length) {
                    
                    $('#routeList').html(routeListHtml).listview('refresh');

                    $('#routeList li').off().on('click', function() {
                        
                        $('#selectRoutePopup').popup('close');
                        fetchPods(this.id);
                    });             

                    g_busy(false);                    
                }
            });
            
        });        
    }
    
    function fetchPods(routeId) {
        
        var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_route_GetUndeliveredCollection&params=(%27' + g_currentUser().SupplierID + '%27|%27' + selectedDate() + '%27|%27' + routeId + '%27)';        
        console.log(url);
        
        g_busy(true);        
        g_ajaxget(url, showPods);
    }
    
    function selectedDate() {
        return moment($("#duedate").val()).format('YYYYMMDD');
    } 
    
    function showPods(pods) {
        
        $('#podList').empty();
                    
        if (!pods.length) {
            
            $('#noPods').removeClass('invisible');
            g_busy(false);            
            return;
        }
        
        $('#noPods').addClass('invisible');
        
        var podListHtml = '';
        
        for (var i = 0; i < pods.length; ++i) {
            
            podListHtml += '<li id="' + pods[i].OrderID + '" data-account="' + pods[i].AccountID + '" data-theme="c"><a href><h3 class="ui-li-heading">' + pods[i].DeliveryName + '</h3><p>' + pods[i].Reference + '</p></a></li>';
        }
        
        $('#podList').html(podListHtml).listview('refresh');
        g_busy(false);  

        $('#podList li').off().on('click', function() {

            g_busy(true);
            
	    var dao = new Dao();
	    dao.index ('Companies',
                // TEST
	        /*'3ALBL01'*/$(this).data('account'),
	        'AccountID',
	         function (company) {
	             sessionStorage.setItem('currentCompany', JSON.stringify(company));
	             fetchPodItems(this.id, $(this).data('account'));
	         },
	         function (error){
                    console.log('ERROR: AccountID ' + $(this).data('account') + ' not found in database.');
	         } , 
	         undefined	 
            );                    
        });                     
    }
    
    function fetchPodItems(podId, accountId) {
        
        var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_orderitems_deliveryDetails&params=(%27' + g_currentUser().SupplierID + '%27|%27' + accountId + '%27|%27' + podId + '%27)';        
        //TEST
//        url = 'http://107.21.55.154/rest/index.php/GetStoredProc?StoredProc=usp_orderitems_deliveryDetails&params=(%27justsqueezed%27|%273ALBL01%27|%27000000000036702%27)';
        console.log(url);        
        g_ajaxget(url, sendItemsToBasket);
    }
    
    function sendItemsToBasket(items) {
        
        if (!items.length) {
            
            g_alert('ERROR: No items retrieved from the REST service.');
            return;
        }
        
        for (var i = 0; i < items.length; ++i) {
            
            g_addProductToBasket(
                items[i].ProductID,
                items[i].SupplierID,
                items[i].AccountID,
                items[i].Quantity,
                g_currentUser().UserID,
                items[i].Nett,
                items[i].Description,
                items[i].Discount,
                items[i].Gross,
                'pod'
                );            
        }
        
        setTimeout(function(){
            
            g_busy(false);
            sessionStorage.setItem('ShoppingCartReturnPage', 'route.html');
            $.mobile.changePage('shoppingCart.html', {transition:'none'});
            
        }, 2000);
    }
    
})();