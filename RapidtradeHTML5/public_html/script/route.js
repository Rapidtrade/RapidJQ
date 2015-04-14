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
    
    var routeRetryCount = 0;
    
    var panelSelectors = {
        routesPanel: '#routesPanel',
        podsPanel: '#podsPanel'
    };
    
    function bind() {
        
        $('#backButton').off().on('click', goBack);
        $('#submit').off().on('click', function() { routeRetryCount = 0; fetchRoutes(true); });
        $('#refreshButton').off().on('click', function() { takeARoute(true); });
        $('#takeRouteButton').off().on('click', function() { takeARoute(false); });
        if (DaoOptions.getValue('UseRoutesLastSelectedDate', 'false') === 'true' && localStorage.getItem('routesLastSelectedDate')) {
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
            var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_route_UnsentCount5&params=(%27' + g_currentUser().SupplierID + '%27|%27' + g_currentUser().UserID + '%27|%27' + selectedDate() + '%27)';
        
            // TEST
//          url = 'http://107.21.55.154/rest/index.php/GetStoredProc?StoredProc=usp_route_UnsentCount&params=(%27justsqueezed%27|%27FTP-100%27|%2720141106%27)';
        
            console.log(url);
            g_ajaxget(url, showRoutes,onFechRoutesOnlineError);
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
    
    function onFechRoutesOnlineError(err) {
        if (routeRetryCount++ < 3 ) {
            setTimeout(function() {
                fetchRoutes(true);
            }, 2000);
        } else {
            g_alert('You seem to have timed out, please check your connection and try again: ' + err);
            showRoutes([]);
        } 
    }
    
    function showRoutes(routes) {                    
        
        $('#routeList').empty();
        
        routeRetryCount = 0;
        
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
                console.log('in');
                item.routeID = $.trim(item.routeID);
                
//                routeListHtml += '<li data-theme="c" id="' + item.routeID + '"' + ((routeNumbers[item.routeID] === 0) ? ' class="ui-disabled" ' : '') + ' ><a href>' + 
//                                '<img class="ui-li-icon" src="' + ((route.UserID === '') ? 'img/yellow.png" alt="Available" ' : 
//                                                ((route.UserID === g_currentUser().UserID) ? 'img/green.png" alt="Taken by you" ' : 
//                                                'img/cancel.png" alt="Taken by other" '))  + '>' + item.Name + (routeNumbers[item.routeID] !== undefined ? '(' + routeNumbers[item.routeID] + ')' : '') + '</a></li>';

                routeListHtml += '<li data-theme="c" id="' + item.routeID + '"' + ((isSomeOfDelivsAreFree(route.UserID) || isSomeOfDelivsAreTakenByMe(route.UserID)) ? '' : ' class="ui-disabled" ') + ' ><a href>' + 
                                '<img id="' + item.routeID + '" class="ui-li-thumb" src="' + ((isSomeOfDelivsAreFree(route.UserID) && !isSomeOfDelivsAreTakenByMe(route.UserID)) ? 'img/Ball-yellow-64.png" data-taken="free" alt="Available" ' : 
                                                (isSomeOfDelivsAreTakenByMe(route.UserID) ? 'img/Ball-green-64.png" ' + (isSomeOfDelivsAreFree(route.UserID) ? 'data-taken="partially"' : 'data-taken="full"') + ' alt="Taken by you" ' : 
                                                'img/Ball-red-64.png" data-taken="full" alt="Taken by other" '))  + '>Route Num: ' + item.routeID + ' - ' + item.Name + (routeNumbers[item.routeID] !== undefined ? '(' + routeNumbers[item.routeID] + ')' : '') + '</a></li>';
                
                if (++addedRows === routes.length) {
                    
                    $('#routeList').html(routeListHtml).listview('refresh');

                    $('#routeList li').off().on('click', function() {
                        
                        selectedRouteId = this.id;
                        showPanel('#podsPanel');
                        fetchPods();
                    });  
                    
                    $('#routeList li img').off().on('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        selectedRouteId = this.id;
                        var isTaken = $(this).data('taken');
                        //g_alert("Selected route: " + selectedRouteId);
                        takeARouteOnThumbClick(isTaken);
                    });

                    g_busy(false);                    
                }
            });
            
        });        
    }
    
    function fetchPods() {        

        g_busy(true);  
        $('#podList').empty();
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
                        if (localStorage.getItem('POD' + selectedRouteId + selectedDate())) {
                            preparePodsForView(routeDeliveries || []);
                        } else {
                            takeARoute(true);
                        }
                    } else {
                        var cachedRoutes = JSON.parse(localStorage.getItem('Route' + selectedDate()));
                            
                        var numOfDelivs = 0;
                        if (cachedRoutes && (cachedRoutes != null) && cachedRoutes.length) {
                            for (var i = 0; i < cachedRoutes.length; ++i) {
                                if (cachedRoutes[i].routeID === selectedRouteId) {
                                    numOfDelivs = cachedRoutes[i].numOfRouts;
                                }
                            }
                        }

                        if (numOfDelivs !== routeDeliveries.length) {
                            takeARoute(true, routeDeliveries);
                        } else {
                            preparePodsForView(routeDeliveries || []);
                        }
                    }
                });
           // }
       // }
    }
    
    function preparePodsForView(pods) {
        $('#podList').empty();
                    
        if (!pods.length) {
            
            $('#noPods').removeClass('invisible');
            if (!$('#takeRouteButton').hasClass('ui-disabled')) 
                $('#takeRouteButton').addClass('ui-disabled');
            g_busy(false);            
            return;
        }
        
        localStorage.setItem('POD' + selectedRouteId + selectedDate(), JSON.stringify(pods));
        modifyCachedRoutes();
        $('#noPods').addClass('invisible');
        
        var podListHtml = '';
        var isItTaken = true;
        $.each(pods, function(index, pod) {
            //var index = i;
            var dao = new Dao();
	    dao.index ('Companies',
                // TEST
	        /*'3ALBL01'*/ pod.AccountID,
	        'index1',
	        function (company) {
	            podListHtml += '<li id="' + pod.OrderID + '" data-account="' + pod.AccountID + '" data-theme="c"' + ((pod.UserID === g_currentUser().UserID || pod.UserID === '') ? '' : ' class="ui-disabled" ') + '>' + 
                    '<a href id="' + pod.OrderID + '" data-account="' + pod.AccountID + '">' + 
                    '<img id="' + pod.OrderID + '" class="ui-li-thumb" style=" width: 85px; height: 85px;" src="' + ((pod.UserID === '') ? 'img/Ball-yellow-64.png" alt="Available" data-taken="false" ' : 
                                                ((pod.UserID === g_currentUser().UserID) ? 'img/Ball-green-64.png" alt="Taken by you" data-taken="true" ' : 
                                                'img/Ball-red-64.png" alt="Taken by other" '))  + '>' + 
                                                '<h3 class="ui-li-heading">' + pod.DeliveryName  + ((pod.UserID !== '' && pod.UserID !== g_currentUser().UserID) ? ' (Taken by ' + pod.UserID + ')' : '') +'</h3>' + 
                                                '<p>' + pod.Reference + '</p><p>Customer: ' + company.Name + '</p></a>' + 
                    '<a href id="' + pod.OrderID + '" data-account="' + pod.AccountID + '">Customer Details</a></li>';
                    
                },
	        function (error){
                    console.log('ERROR: AccountID ' + pod.AccountID + ' not found in database.');
                    g_alert('ERROR: AccountID ' + pod.AccountID + ' not found in database.');   
                    g_busy(false);
	        } , 
	        function () {
                    if (index === pods.length - 1)
                        showPods(podListHtml, isItTaken);
                }	 
            );
            
            isItTaken = isItTaken && (pod.UserID === g_currentUser().UserID || pod.UserID !== '');  
            
        });
    }
    
    function showPods(podListHtml, isItTaken) {
        
//        $('#podList').empty();
//                    
//        if (!pods.length) {
//            
//            $('#noPods').removeClass('invisible');
//            if (!$('#takeRouteButton').hasClass('ui-disabled')) 
//                $('#takeRouteButton').addClass('ui-disabled');
//            g_busy(false);            
//            return;
//        }
//        
//        localStorage.setItem('POD' + selectedRouteId + selectedDate(), JSON.stringify(pods));
//        
//        $('#noPods').addClass('invisible');
//        
//        var podListHtml = '';
//        var isItTaken = false;
//        for (var i = 0; i < pods.length; ++i) {
//            
//            podListHtml += '<li id="' + pods[i].OrderID + '" data-account="' + pods[i].AccountID + '" data-theme="c">' + 
//                    '<a href id="' + pods[i].OrderID + '" data-account="' + pods[i].AccountID + '"><h3 class="ui-li-heading">' + pods[i].DeliveryName + '</h3><p>' + pods[i].Reference + '</p><p>' + pods[i].Reference + '</p></a>' + 
//                    '<a href id="' + pods[i].OrderID + '" data-account="' + pods[i].AccountID + '">Customer Details</a></li>';
//            if (pods[i].UserID !== '') isItTaken = true;
//        }
        
        if (isItTaken) {            
            if (!$('#takeRouteButton').hasClass('ui-disabled')) 
                $('#takeRouteButton').addClass('ui-disabled');
        } else {
            if ($('#takeRouteButton').hasClass('ui-disabled')) 
                $('#takeRouteButton').removeClass('ui-disabled');
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
	        'index1',
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
	        'index1',
	        function (company) {
	            sessionStorage.setItem('currentCompany', JSON.stringify(company));
	             
                    var jsonForm = new JsonForm();
                    jsonForm.oncomplete = function (event) {
                        setTimeout(function() {
                            $('#routeCompanyPopup').popup("open");
                            $('#routeCompanyPopup a').off().on('click', function() {
                                $('#routeCompanyPopup').popup("close");
                            });
                            g_busy(false);
                            $('#routeCompanyPopup').popup( 'reposition', 'positionTo: window' );                            
                        }, 500);
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
        
        $('#podList li img').off().on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            g_busy(true);
            
            var deliveryID = this.id;
            var isTaken = $(this).data('taken');
            
            takeALoad(deliveryID, isTaken);
            
            g_busy(false);
            //return false;
        });
    }
             
    function takeARoute(isRefreshPressed, routeDeliveries) {
        g_busy(true);
        var onTakeRouteSuccess = function(deliveries) {
            if (deliveries.length === 0) {
                preparePodsForView(deliveries);
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
                                preparePodsForView(deliveries);
                                if (isRefreshPressed) {
                                    //g_alert('You successfully refreshed local data.');
                                } else {
                                  //g_alert('You successfully took this route.');
                                  modifyCachedRoutes();
                                  //$('#refreshButton').click();
                                }
                            }
                        });
                    };
                    
                    var onGetDeliveryItemsError = function() {                        
                        g_alert('You seem to have timed out, please check your connection and try again.');  
                        if (index === deliveries.length - 1) {
                            preparePodsForView(deliveries);
                            if (isRefreshPressed) {
                                //g_alert('You successfully refreshed local data.');
                            } else {
                              //g_alert('You successfully took this route.');
                              modifyCachedRoutes();
                              //$('#refreshButton').click();
                            }
                        }
                    };
                    
                    console.log(url);
                    g_ajaxget(url, onGetDeliveryItemsSuccess, onGetDeliveryItemsError);
                };
                
                
                
                var dao = new Dao();
                dao.put(delivery, 'Orders', (delivery.SupplierID + delivery.OrderID),undefined, undefined, onDeliveryPutSuccess);
            });
          
        };
        
        var onGetDelivsError = function() {                        
            g_alert('You seem to have timed out, please check your connection and try again.');  
            preparePodsForView([]);            
        };
        
        
        if (g_isOnline()) {
            /*
            if (isRefreshPressed) {
               // g_alert('You are about to refresh deliveries for the Route: ' + selectedRouteId + ' for date ' + $("#duedate").val() + '.');
            } else {
               // g_alert('You are about to take the Route: ' + selectedRouteId + ' for date ' + $("#duedate").val() + '.');
            }
<<<<<<< .mine
            */
            var url = g_restPHPUrl + 'GetStoredProc?StoredProc=' + (isRefreshPressed ? 'usp_orders_readdeliveries4' : 'usp_route_TakeARoute') + '&params=(%27' + g_currentUser().SupplierID + '%27|%27' + selectedRouteId + '%27|%27' + g_currentUser().UserID + '%27|%27' + selectedDate() + '%27)';
            console.log(url);
            localStorage.removeItem('POD' + selectedRouteId + selectedDate());
            g_ajaxget(url, onTakeRouteSuccess, onGetDelivsError);
        } else {
            g_alert('Sorry, You must be online to perform this action.');
            preparePodsForView(routeDeliveries || []);
        }
    }
    
    
    
    function takeARouteOnThumbClick(isTaken) {
        var onTakeRouteOnThumbClickSuccess = function(deliveries) {
            if (deliveries.length === 0) {
                preparePodsForView(deliveries);
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
                                preparePodsForView(deliveries);
                                modifyCachedRoutes();
                                fetchRoutes();
                            }
                        });
                    };
                    
                    var onGetDeliveryItemsError = function() {                        
                        g_alert('You seem to have timed out, please check your connection and try again.');  
                        if (index === deliveries.length - 1) {
                            preparePodsForView(deliveries);
                            modifyCachedRoutes();
                            fetchRoutes();                            
                        }
                    };
                    
                    console.log(url);
                    g_ajaxget(url, onGetDeliveryItemsSuccess, onGetDeliveryItemsError);
                };
                
                
                
                var dao = new Dao();
                dao.put(delivery, 'Orders', (delivery.SupplierID + delivery.OrderID),undefined, undefined, onDeliveryPutSuccess);
            });
          
        };
        
        var onTakeError = function() {                        
            g_alert('You seem to have timed out, please check your connection and try again.');  
            g_busy(false);        
        };
        
        if (g_isOnline()) {
            
            if (isTaken !== 'full') { 
                var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_route_TakeARoute&params=(%27' + g_currentUser().SupplierID + '%27|%27' + selectedRouteId + '%27|%27' + g_currentUser().UserID + '%27|%27' + selectedDate() + '%27)';
                console.log(url);
                localStorage.removeItem('POD' + selectedRouteId + selectedDate());
                g_ajaxget(url, onTakeRouteOnThumbClickSuccess, onTakeError);
            } else {
                var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_route_ReleaseARoute&params=(%27' + g_currentUser().SupplierID + '%27|%27' + selectedRouteId + '%27|%27' + g_currentUser().UserID + '%27|%27' + selectedDate() + '%27)';
                console.log(url);
                localStorage.removeItem('POD' + selectedRouteId + selectedDate());
                g_ajaxget(url, onTakeRouteOnThumbClickSuccess, onTakeError);
            }
        } else {
            g_alert('Sorry, You must be online to perform this action.');
            //preparePodsForView(routeDeliveries || []);
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
            dao.fetchDeliveryDetails(podId, accountId, undefined
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
        if (isPodsPanel) {
            $('#podsPanelHeader').text('Route Num: ' + selectedRouteId);
            if (!$('#routePage .logoSml').hasClass('invisible'))
                $('#routePage .logoSml').addClass('invisible');
            if ($('#podsPanelHeader').hasClass('invisible'))
                $('#podsPanelHeader').removeClass('invisible');
        } else {
            if (!$('#podsPanelHeader').hasClass('invisible'))
                $('#podsPanelHeader').addClass('invisible');
            if ($('#routePage .logoSml').hasClass('invisible'))
                $('#routePage .logoSml').removeClass('invisible');
        }
    }
    
    function modifyCachedRoutes() {
        
        var cachedDeliveries = JSON.parse(localStorage.getItem('POD' + selectedRouteId + selectedDate()));
        // prepare new userID for selected route
        var newUserID = '';
        var comma = '';
        if (cachedDeliveries && (cachedDeliveries != null) && cachedDeliveries.length) {
            for (var i = 0; i < cachedDeliveries.length; ++i) {
                newUserID = newUserID + comma + cachedDeliveries[i].UserID;
                comma = ',';
            }
        }
        
        var cachedRoutes = JSON.parse(localStorage.getItem('Route' + selectedDate()));
        if (cachedRoutes && (cachedRoutes != null) && cachedRoutes.length) {
            for (var i = 0; i < cachedRoutes.length; ++i) {
                if (cachedRoutes[i].routeID === selectedRouteId) {
                    cachedRoutes[i].UserID = newUserID;//g_currentUser().UserID;
                }
            }
            
            
            localStorage.setItem('Route' + selectedDate(), JSON.stringify(cachedRoutes));
        }        
    }
    
    function isSomeOfDelivsAreTakenByMe(users, numberOfDelivs) {
        var usersArray = users.split(',');
        
        //var res = false;
        for (var i = 0; i < usersArray.length; ++i) {
            if (usersArray[i].trim().toLowerCase() == g_currentUser().UserID.toLowerCase())
                return true;
        }
        
        return false;
    }
    
    function isSomeOfDelivsAreFree(users, numberOfDelivs) {
        var usersArray = users.split(',');
        
        //var res = false;
        for (var i = 0; i < usersArray.length; ++i) {
            if (usersArray[i].trim().toLowerCase() === '')
                return true;
        }
        
        return false;
    }
        
    function takeALoad(deliveryID, isTaken) {
        
        if (!g_isOnline(false)) {
            g_alert('Sorry, You must be online to perform this action.');
            return;
        }
        
        
        var url = g_restPHPUrl + 'GetStoredProc?StoredProc=';
        
        if (isTaken) {
            url += 'usp_deliveries_unassign&params=(%27' + g_currentUser().SupplierID + '%27|%27' + g_currentUser().UserID + '%27|%27' + deliveryID + '%27)';
        } else {
            url += 'usp_deliveries_assign&params=(%27' + g_currentUser().SupplierID + '%27|%27' + g_currentUser().UserID + '%27|%27' + deliveryID + '%27)';
        }
        
        var onSuccess = function(deliveries) {
            
            if (deliveries.length === 0) {
                onError(deliveries);
                return;
            } else if (deliveries.length > 1) {
                onError(deliveries);
                return;
            } else if (deliveries.length === 1 && deliveries[0].Error) {
                onError(deliveries);
                return;
            }
            
            
            $.each(deliveries, function(index, delivery) {
            //for (var i = 0; i < deliveries.length; ++i) {
                //var index = i; 
                
                var onDeliveryPutSuccess = function() {                    
                    fetchPods();
                    //modifyCachedRoutes();
                };
                
                
                
                var dao = new Dao();
                dao.put(delivery, 'Orders', (delivery.SupplierID + delivery.OrderID),undefined, undefined, onDeliveryPutSuccess);
            });
        };
        
        var onError = function(error) {
            g_alert('Sorry, Something went wrong.');
        };
        
        
        console.log(url);
        g_ajaxget(url, onSuccess, onError);        
        
    }
    
})();