var route = (function() {
    
    // Public
    
    /*
     * route.init();
     */
    
    return {
        
        init: function() {
            
            $('#refreshButton').hide();
            $('#takeRouteButton').hide();
            bind();
        }
    }
    
    // Private    
    
    var selectedRouteId = 0;
    
    var panelSelectors = {
        routesPanel: '#routesPanel',
        podsPanel: '#podsPanel'
    }
    
    function bind() {
        
        $('#backButton').off().on('click', goBack);
        $('#submit').off().on('click', fetchRoutes);
        $('#refreshButton').off().on('click', fetchPods);
        $('#takeRouteButton').off().on('click', takeARoute);
        if (localStorage.getItem('routesLastSelectedDate')) {
            $("#duedate").val(localStorage.getItem('routesLastSelectedDate'));
            //fetchRoutes();
        }
    }
    
    function goBack() {
        
        if ($('#podsPanel').is(':visible')) {
            showPanel('#routesPanel')
        } else {
            localStorage.setItem('routesLastSelectedDate', $("#duedate").val());
            g_loadMenu();
        }
    }
    
    function selectedDate() {
        return moment($("#duedate").val()).format('YYYYMMDD');
    } 
    
    function fetchRoutes() {
                
        g_busy(true);
        
        if (!g_isOnline()) {
            
            var cachedRoutes = JSON.parse(localStorage.getItem('Route' + selectedDate()));
            if (routes.length) {
                showRoutes(cachedRoutes || []);
            } else {
                var dao = new Dao();
                dao.fetchRoutesByDate($("#duedate").val(), undefined
                , function(message) {
                    console.log(message);}, 
                function(fetchedRoutes) {
                    showRoutes(fetchedRoutes || []);              
                });
            }
            return;
        } 
        
        var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_route_UnsentCount2&params=(%27' + g_currentUser().SupplierID + '%27|%27' + g_currentUser().UserID + '%27|%27' + selectedDate() + '%27)';
        
        // TEST
//        url = 'http://107.21.55.154/rest/index.php/GetStoredProc?StoredProc=usp_route_UnsentCount&params=(%27justsqueezed%27|%27FTP-100%27|%2720141106%27)';
        
        console.log(url);
        g_ajaxget(url, showRoutes);
    }
    
    function showRoutes(routes) {                    
        
        $('#routeList').empty();
        
        if (!routes.length) {
            
            g_busy(false);            
            return;
        }
        
        localStorage.setItem('Route' + selectedDate(), JSON.stringify(routes));
        
        var routeListHtml = '';
        
        var routeNumbers = {}, addedRows = 0;
        
        $.each(routes, function(index, route) {      
            
            route.routeID = $.trim(route.routeID);
            routeNumbers[route.routeID] = route.numOfRouts;
            
            var dao = new Dao();
            dao.get('Route', route.routeID, function(item) {
                
                item.routeID = $.trim(item.routeID);
                
                routeListHtml += '<li data-theme="c" id="' + item.routeID + '"' + ((routeNumbers[item.routeID] === 0) ? ' class="ui-disabled" ' : '') + ' ><a href>' + 
                                '<img class="ui-li-icon" src="' + ((route.UserID === '') ? 'img/yellow.png" alt="Available" ' : 
                                                ((route.UserID === g_currentUser().UserID) ? 'img/green.png" alt="Taken by you" ' : 
                                                'img/cancel.png" alt="Taken by other" '))  + '>' + item.Name + (routeNumbers[item.routeID] !== undefined ? '(' + routeNumbers[item.routeID] + ')' : '') + '</a></li>';
                
                if (++addedRows === routes.length) {
                    
                    $('#routeList').html(routeListHtml).listview('refresh');

                    $('#routeList li').off().on('click', function() {
                        
                        showPanel('#podsPanel');
                        selectedRouteId = this.id;
                        fetchPods();
                    });             

                    g_busy(false);                    
                }
            });
            
        });        
    }
    
    function fetchPods() {        

        g_busy(true);  
        
        if (g_isOnline()) {
            
            var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_route_GetUndeliveredCollection&params=(%27' + g_currentUser().SupplierID + '%27|%27' + selectedDate() + '%27|%27' + selectedRouteId + '%27)';        
            console.log(url);
      
            g_ajaxget(url, showPods);
            
        } else {
            
            var cachedPods = JSON.parse(localStorage.getItem('POD' + selectedRouteId)); 
            if (cachedPods && (cachedPods != null) && cachedPods.length) {
                showPods(cachedPods || []); 
            } else {
                var dao = new Dao();
                dao.sqlFetchRouteDeliveries(selectedRouteId,$("#duedate").val(), undefined
                , function(message) {
                    console.log(message);}, 
                function(routeDeliveries) {
                    showPods(routeDeliveries || []);              
                });
            }
        }
    }    
    
    function showPods(pods) {
        
        $('#podList').empty();
                    
        if (!pods.length) {
            
            $('#noPods').removeClass('invisible');
            g_busy(false);            
            return;
        }
        
        localStorage.setItem('POD' + selectedRouteId, JSON.stringify(pods));
        
        $('#noPods').addClass('invisible');
        
        var podListHtml = '';
        var isItTaken = false;
        for (var i = 0; i < pods.length; ++i) {
            
            podListHtml += '<li id="' + pods[i].OrderID + '" data-account="' + pods[i].AccountID + '" data-theme="c"><a href><h3 class="ui-li-heading">' + pods[i].DeliveryName + '</h3><p>' + pods[i].Reference + '</p></a></li>';
            if (pods[i].UserID !== '') isItTaken = true;
        }
        
        if (isItTaken) {            
            if (!$('#takeRouteButton').hasClass('ui-disabled')) 
                $('#takeRouteButton').addClass('ui-disabled');
        }
        
        $('#podList').html(podListHtml).listview('refresh');
        g_busy(false);  

        $('#podList li').off().on('click', function() {

            g_busy(true);
            
            var podID = this.id;
            var accID = $(this).data('account');
            
	    var dao = new Dao();
	    dao.index ('Companies',
                // TEST
	        /*'3ALBL01'*/ $(this).data('account'),
	        'AccountID',
	         function (company) {
	             sessionStorage.setItem('currentCompany', JSON.stringify(company));
	             //fetchPodItems(this.id, $(this).data('account'));
                     fetchPodItems(podID, accID);
	         },
	         function (error){
                    console.log('ERROR: AccountID ' + accID + ' not found in database.');
	         } , 
	         undefined	 
            );                    
        });                     
    }
    
    function takeARoute() {
        
        var onTakeRouteSuccess = function(deliveries) {
            for (var i = 0; i < deliveries.length; ++i) {
               var index = i; 
                var onDeliveryPutSuccess = function() {
                  var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_orderitems_deliveryDetails&params=(%27' + deliveries[index].SupplierID + '%27|%27' + deliveries[index].AccountID + '%27|%27' + deliveries[index].OrderID + '%27)';
                  
                  var onGetDeliveryItemsSuccess = function(deliveryItems) {
                      var dao = new Dao();
                      dao.putMany((deliveryItems), 'OrderItems', undefined, undefined, function() {
                          if (index === deliveries.length - 1) {
                              g_alert('You successfully took this route.');
                              $('#refreshButton').click();
                          }
                      });
                  };
                  g_ajaxget(url, onGetDeliveryItemsSuccess);
                };
                
                
                
                var dao = new Dao();
                dao.put(deliveries[i], 'Orders', (deliveries[i].SupplierID + deliveries[i].OrderID),undefined, undefined, onDeliveryPutSuccess);
            }
          
        };
        
        
        if (g_isOnline()) {
            g_alert('You are about to take the Route: ' + selectedRouteId + ' for date ' + $("#duedate").val() + '.');
            var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_route_TakeARoute&params=(%27' + g_currentUser().SupplierID + '%27|%27' + selectedRouteId + '%27|%27' + g_currentUser().UserID + '%27|%27' + selectedDate() + '%27)';
            console.log(url);
            
            g_ajaxget(url, onTakeRouteSuccess);
        } else {
            g_alert('Sorry, You must be online to perform this action.');
        }
    }
    
    function fetchPodItems(podId, accountId) {
        if (g_isOnline()) {
            var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_orderitems_deliveryDetails&params=(%27' + g_currentUser().SupplierID + '%27|%27' + accountId + '%27|%27' + podId + '%27)';        
            //TEST
    //        url = 'http://107.21.55.154/rest/index.php/GetStoredProc?StoredProc=usp_orderitems_deliveryDetails&params=(%27justsqueezed%27|%273ALBL01%27|%27000000000036702%27)';
            console.log(url);        
            g_ajaxget(url, sendItemsToBasket);
        } else {
            var dao = new Dao();
            dao.sqlDeliveryDetails(podId, accountId, undefined
                , function(message) {
                    console.log(message);}, 
                function(deliveryItems) {
                    sendItemsToBasket(deliveryItems || []);              
                });
        }
    }
    
    function sendItemsToBasket(items) {
        
        if (!items.length) {
            
            g_alert('ERROR: No items retrieved from the REST service.');
            g_busy(false);
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
            localStorage.setItem('routesLastSelectedDate', $("#duedate").val());
            sessionStorage.setItem('ShoppingCartReturnPage', 'route.html');
            $.mobile.changePage('shoppingCart.html', {transition:'none'});
            
        }, 2000);
    }
    
    function showPanel(panelSelector) {
        
        $('.panel').addClass('invisible');
        $(panelSelector).removeClass('invisible');
        
        var isPodsPanel = (panelSelector === '#podsPanel');
        $('#backButton .ui-btn-text').text(isPodsPanel ? 'Routes' : 'Menu');
        $('#takeRouteButton').toggle(isPodsPanel);
        if ($('#takeRouteButton').hasClass('ui-disabled')) 
                $('#takeRouteButton').removeClass('ui-disabled');
        $('#refreshButton').toggle(isPodsPanel);
    }
    
})();