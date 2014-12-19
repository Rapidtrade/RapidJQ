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
    };
    
    function bind() {
        
        $('#backButton').off().on('click', goBack);
        $('#submit').off().on('click', function() { fetchRoutes(true); });
        $('#refreshButton').off().on('click', function() { takeARoute(true); });
        $('#takeRouteButton').off().on('click', function() { takeARoute(false); });
        if (localStorage.getItem('routesLastSelectedDate')) {
            $("#duedate").val(localStorage.getItem('routesLastSelectedDate'));
            selectedRouteId = localStorage.getItem('routesLastSelectedRouteID');
            if (localStorage.getItem('routesLastPanelViewed') === '#routesPanel') {
                showPanel('#routesPanel')
                fetchRoutes();
            } else {
                showPanel('#podsPanel');
                fetchPods();
            }
        }
    }
    
    function goBack() {
        
        if ($('#podsPanel').is(':visible')) {
            showPanel('#routesPanel')
            fetchRoutes();
        } else {
            localStorage.setItem('routesLastSelectedDate', $("#duedate").val());
            localStorage.setItem('routesLastSelectedRouteID', selectedRouteId);
            localStorage.setItem('routesLastPanelViewed', '#routesPanel');
            g_loadMenu();
        }
    }
    
    function selectedDate() {
        return moment($("#duedate").val()).format('YYYYMMDD');
    } 
    
    function fetchRoutes(isSubmitClicked) {
                
        g_busy(true);
        
        if (isSubmitClicked && g_isOnline()) {
            var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_route_UnsentCount3&params=(%27' + g_currentUser().SupplierID + '%27|%27' + g_currentUser().UserID + '%27|%27' + selectedDate() + '%27)';
        
            // TEST
//          url = 'http://107.21.55.154/rest/index.php/GetStoredProc?StoredProc=usp_route_UnsentCount&params=(%27justsqueezed%27|%27FTP-100%27|%2720141106%27)';
        
            console.log(url);
            g_ajaxget(url, showRoutes);
        } else {
            
            var cachedRoutes = JSON.parse(localStorage.getItem('Route' + selectedDate()));
            if (cachedRoutes && cachedRoutes.length) {
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
        
        //if (g_isOnline()) {
            
        ///    var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_route_GetUndeliveredCollection&params=(%27' + g_currentUser().SupplierID + '%27|%27' + selectedDate() + '%27|%27' + selectedRouteId + '%27)';        
        //    console.log(url);
            
        //    g_ajaxget(url, showPods);
            
       // } else {
            
            //var cachedPods = JSON.parse(localStorage.getItem('POD' + selectedRouteId + selectedDate())); 
            //if (cachedPods && (cachedPods != null) && cachedPods.length) {
             //   showPods(cachedPods || []); 
            //} else {
                var dao = new Dao();
                dao.sqlFetchRouteDeliveries(selectedRouteId,$("#duedate").val(), undefined
                , function(message) {
                    console.log(message);}, 
                function(routeDeliveries) {
                    //showPods(routeDeliveries || []); 
                    if (!(routeDeliveries && (routeDeliveries != null) && routeDeliveries.length)) {
                        takeARoute(true);
                    } else {
                        showPods(routeDeliveries || []);
                    }
                });
           // }
       // }
    }    
    
    function showPods(pods) {
        
        $('#podList').empty();
                    
        if (!pods.length) {
            
            $('#noPods').removeClass('invisible');
            if (!$('#takeRouteButton').hasClass('ui-disabled')) 
                $('#takeRouteButton').addClass('ui-disabled');
            g_busy(false);            
            return;
        }
        
        localStorage.setItem('POD' + selectedRouteId + selectedDate(), JSON.stringify(pods));
        
        $('#noPods').addClass('invisible');
        
        var podListHtml = '';
        var isItTaken = false;
        for (var i = 0; i < pods.length; ++i) {
            
            podListHtml += '<li id="' + pods[i].OrderID + '" data-account="' + pods[i].AccountID + '" data-theme="c">' + 
                    '<a href id="' + pods[i].OrderID + '" data-account="' + pods[i].AccountID + '"><h3 class="ui-li-heading">' + pods[i].DeliveryName + '</h3><p>' + pods[i].Reference + '</p></a>' + 
                    '<a href id="' + pods[i].OrderID + '" data-account="' + pods[i].AccountID + '">Customer Details</a></li>';
            if (pods[i].UserID !== '') isItTaken = true;
        }
        
        if (isItTaken) {            
            if (!$('#takeRouteButton').hasClass('ui-disabled')) 
                $('#takeRouteButton').addClass('ui-disabled');
        }
        
        $('#podList').html(podListHtml).listview('refresh');
        g_busy(false);  

        $('#podList li a:even').off().on('click', function() {
            
            g_busy(true);
            
            var podID = this.id;
            var accID = $(this).data('account');
            
	    var dao = new Dao();
	    dao.index ('Companies',
                // TEST
	        /*'3ALBL01'*/ accID,
	        'AccountID',
	         function (company) {
	             sessionStorage.setItem('currentCompany', JSON.stringify(company));
	             //fetchPodItems(this.id, $(this).data('account'));
                     fetchPodItems(podID, accID);
	         },
	         function (error){
                    console.log('ERROR: AccountID ' + accID + ' not found in database.');
                    g_alert('ERROR: AccountID ' + accID + ' not found in database.');   
                    g_busy(false);
	         } , 
	         undefined	 
            );                    
        }); 
        
        $('#podList li a:odd').off().on('click', function() {

            g_busy(true);
            
            var podID = this.id;
            var accID = $(this).data('account');
            
            var dao = new Dao();
	    dao.index ('Companies',
                // TEST
	        /*'3ALBL01'*/ accID,
	        'AccountID',
	        function (company) {
	            sessionStorage.setItem('currentCompany', JSON.stringify(company));
	             
                    var jsonForm = new JsonForm();
                    jsonForm.oncomplete = function (event) {
                        $('#routeCompanyPopup').popup("open");
                        $('#routeCompanyPopup a').off().on('click', function() {
                            $('#routeCompanyPopup').popup("close");
                        });
                        g_busy(false);
                    };
                    jsonForm.show(g_currentUser().SupplierID, '#routeCmpanyForm', g_currentCompany(), 'Company');           
                },
	        function (error){
                    console.log('ERROR: AccountID ' + accID + ' not found in database.');
                    g_alert('ERROR: AccountID ' + accID + ' not found in database.');   
                    g_busy(false);
	        } , 
	        undefined	 
            );
	    //g_alert('Company details for: ' + accID);   
            
            //g_busy(false);
        });
    }
        
    function takeARoute(isRefreshPressed) {
        
        var onTakeRouteSuccess = function(deliveries) {
            if (deliveries.length === 0) {
                showPods(deliveries);
                return;
            }
            $.each(deliveries, function(index, delivery) {
            //for (var i = 0; i < deliveries.length; ++i) {
                //var index = i; 
                
                var onDeliveryPutSuccess = function() {
                    var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_orderitems_deliveryDetails&params=(%27' + delivery.SupplierID + '%27|%27' + delivery.AccountID + '%27|%27' + delivery.OrderID + '%27)';
                  
                    var onGetDeliveryItemsSuccess = function(deliveryItems) {
                        var dao = new Dao();
                        dao.putMany((deliveryItems), 'OrderItems', undefined, undefined, function() {
                            if (index === deliveries.length - 1) {
                                if (isRefreshPressed) {
                                    g_alert('You successfully refreshed local data.');
                                } else {
                                  g_alert('You successfully took this route.');
                                  modifyCachedRoutes();
                                  //$('#refreshButton').click();
                                }
                                showPods(deliveries);
                            }
                        });
                    };
                    
                    console.log(url);
                    g_ajaxget(url, onGetDeliveryItemsSuccess);
                };
                
                
                
                var dao = new Dao();
                dao.put(delivery, 'Orders', (delivery.SupplierID + delivery.OrderID),undefined, undefined, onDeliveryPutSuccess);
            });
          
        };
        
        
        if (g_isOnline()) {
            if (isRefreshPressed) {
                g_alert('You are about to refresh deliveries for the Route: ' + selectedRouteId + ' for date ' + $("#duedate").val() + '.');
            } else {
                g_alert('You are about to take the Route: ' + selectedRouteId + ' for date ' + $("#duedate").val() + '.');
            }
            var url = g_restPHPUrl + 'GetStoredProc?StoredProc=' + (isRefreshPressed ? 'usp_orders_readdeliveries3' : 'usp_route_TakeARoute') + '&params=(%27' + g_currentUser().SupplierID + '%27|%27' + selectedRouteId + '%27|%27' + g_currentUser().UserID + '%27|%27' + selectedDate() + '%27)';
            console.log(url);
            localStorage.removeItem('POD' + selectedRouteId + selectedDate());
            g_ajaxget(url, onTakeRouteSuccess);
        } else {
            g_alert('Sorry, You must be online to perform this action.');
        }
    }
        
    function fetchPodItems(podId, accountId) {
       // if (g_isOnline()) {
       //     var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_orderitems_deliveryDetails&params=(%27' + g_currentUser().SupplierID + '%27|%27' + accountId + '%27|%27' + podId + '%27)';        
            //TEST
    //        url = 'http://107.21.55.154/rest/index.php/GetStoredProc?StoredProc=usp_orderitems_deliveryDetails&params=(%27justsqueezed%27|%273ALBL01%27|%27000000000036702%27)';
       //     console.log(url);        
        //    g_ajaxget(url, sendItemsToBasket);
        //} else {
            var dao = new Dao();
            dao.sqlDeliveryDetails(podId, accountId, undefined
                , function(message) {
                    console.log(message);}, 
                function(deliveryItems) {
                    sendItemsToBasket(deliveryItems || []);              
                });
        //}
    }
    
    function sendItemsToBasket(items) {
        
        if (!items.length) {
            
            g_alert('ERROR: No items retrieved from the REST service.');
            g_busy(false);
            return;
        }
        
        for (var i = 0; i < items.length; ++i) {            
            items[i].Type = 'pod';
            localStorage.setItem('routesLastDeliverySentToBasket', items[i].OrderID);
        }
        
        basket.saveItems(items, function() {
           
            localStorage.setItem('routesLastSelectedDate', $("#duedate").val());            
            localStorage.setItem('routesLastSelectedRouteID', selectedRouteId);
            localStorage.setItem('routesLastPanelViewed', '#podsPanel');
            sessionStorage.setItem('ShoppingCartReturnPage', 'route.html');
            sessionStorage.setItem('orderheaderNext', 'podsPanel');
            $.mobile.changePage('shoppingCart.html', {transition:'none'});            
        });
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
    
    function modifyCachedRoutes(deliveries) {
        
        var cachedRoutes = JSON.parse(localStorage.getItem('Route' + selectedDate()));
        if (cachedRoutes && (cachedRoutes != null) && cachedRoutes.length) {
            for (var i = 0; i < cachedRoutes.length; ++i) {
                if (cachedRoutes[i].routeID === selectedRouteId) {
                    cachedRoutes[i].UserID = g_currentUser().UserID;
                }
            }
            
            
            localStorage.setItem('Route' + selectedDate(), JSON.stringify(cachedRoutes));
        }        
    }
    
})();