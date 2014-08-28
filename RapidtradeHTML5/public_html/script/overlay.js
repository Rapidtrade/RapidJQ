var g_companyOnHoldMessageShown;

function overlayInit(pageId) {
    
    g_companyOnHoldMessageShown = false;
	
    var menuPanel = '<div data-role="panel" data-dismissible="false" data-display="push" id="menuPanel" class="overlayMenu invisible" data-theme="b">';

    if (g_currentUser().Role != 'CUST') {

            menuPanel += '<ul id="mainMenu" data-role="listview" data-inset="true" data-divider-theme="d" >' +
                                                    '<li data-role="list-divider" role="heading">' + g_companyPageTranslation.translateText('Main Menu') + '</li>' +
                                                    '<li id="companyItem">' + g_companyPageTranslation.translateText('Company Details') + '</li>' +
                                                    '<li id="historyItem">' + g_companyPageTranslation.translateText('Customer History') + '</li>';

            if (!g_vanSales) {

                var orderTypes = overlayFetchOrderTypes();

                //Check if we can invoice, then add order types
                if (g_currentUser().Role) {

                    if (g_currentUser().Role.indexOf('canInv') !== -1) {		

                        var warehouses = ((g_currentUser().Role.split(',')[1]).split('=')[1]).split('|');
                        $.each(warehouses, function(key, value) {   

                             orderTypes.push('Invoice-' + value);
                        });				
                    }
                }

                if (orderTypes.length) {

                    if (!((orderTypes.length == 1) && (orderTypes[0].toLowerCase() == 'none'))) {

                        $.each(orderTypes, function(key, value) {   

                            var orderTypeItemText = ('Create ' + value).replace('Create Invoice', g_companyPageTranslation.translateText('Create Invoice'))
                                    .replace('Create Order', g_companyPageTranslation.translateText('Create Order'));
                            
                            var classes = 'orderItem' + (value.indexOf('Invoice') !== -1 ? ' invoiceItem' : ''); 
                            
                            menuPanel += '<li id="pricelist' + value + 'Item" class="' + classes + '">' + orderTypeItemText + '</li>';
                        });
                    }

                } else {

                    menuPanel += '<li id="pricelistOrderItem" class="orderItem">' + g_companyPageTranslation.translateText('Create Order') + '</li>';
                }

            } else {

                menuPanel += '<li id="pricelistOrderItem" class="orderItem">' + g_companyPageTranslation.translateText('Create Order') + '</li>';
            }	

            menuPanel += '<li id="activityItem">' + g_companyPageTranslation.translateText('Add Activity') + '</li>' +
                                     '</ul>';
    }

    var showPricelistMenu = (DaoOptions.getValue('MobileCategories') == 'true') || (DaoOptions.getValue('AllowAdvancedSearch') == 'true');
    var pricelistMenuEnd = '</ul></div>';


    if (showPricelistMenu) {

            menuPanel += '<div id="pricelistMenu">' +   
                    '<ul data-role="listview" data-inset="true" data-divider-theme="d" >' +
                    '<li data-role="list-divider" role="heading">' + g_companyPageTranslation.translateText('Pricelist') + '</li>' +
                    '<li id="basic" class="ui-btn-active">' + g_companyPageTranslation.translateText('Basic Search') + '</li>';

            if (DaoOptions.getValue('MobileCategories') == 'true')			
                menuPanel += '<li id="categories">' + g_companyPageTranslation.translateText('Product Categories') + '</li>';

            if (DaoOptions.getValue('AllowAdvancedSearch') == 'true') {

                menuPanel += '<li id="advanced">Advanced Search</li>';

                if (DaoOptions.getValue('extrasearch')) {

                    var extraMenuItemArray = JSON.parse(DaoOptions.getValue('extrasearch'));

                    for ( var i = 0; i < extraMenuItemArray.length; i++)
                            menuPanel += '<li id="' + extraMenuItemArray[i].search + '">' + extraMenuItemArray[i].label + '</li>';
                }	 

                menuPanel += pricelistMenuEnd;

            } else {

                if (DaoOptions.getValue('extrasearch')) {

                    var extraMenuItemArray = JSON.parse(DaoOptions.getValue('extrasearch'));

                    for ( var i = 0; i < extraMenuItemArray.length; i++)
                            menuPanel += '<li id="' + extraMenuItemArray[i].search + '">' + extraMenuItemArray[i].label + '</li>';
                }	 

                menuPanel += pricelistMenuEnd;

            }
    } 

    menuPanel += '<div id="productDetailsMenu">' +
                                '<ul data-role="listview" data-inset="true" data-divider-theme="d">' +
                                    '<li data-role="list-divider" role="heading">Product Details</li>' +
                                    '<li id="price" class="ui-btn-active">Price</li>';

    if (DaoOptions.getValue('ShowProductInfo') == 'true')          
        menuPanel += '<li>Product Info</li>'; 

    if (DaoOptions.getValue('ShowComponents') === 'true')
        menuPanel += '<li id="components">Components</li>';

    if (DaoOptions.getValue('ShowAlternate') === 'true')
        menuPanel += '<li id="altProducts">Alternative Products</li>';

    if (DaoOptions.getValue('ShowWhereUsed') === 'true')
        menuPanel += '<li id="whereUsed">Where Used</li>';

    if (DaoOptions.getValue('ShowTechnical') === 'true')
        menuPanel += '<li>Technical Info</li>';

    menuPanel += '<li>Large Image</li>' +
                 '</ul>' +
                 '</div>';

    if (g_currentUser().Role != 'CUST') 
        menuPanel += '<a data-role="button" href="myterritory.html" data-icon="search" data-theme="b">' + g_companyPageTranslation.translateText('My Customers') + '</a>';

    menuPanel += '<p><a id="home" data-role="button" data-icon="home" data-theme="e">' + g_companyPageTranslation.translateText('Home') + '</a>';

    menuPanel += '</p></div>';

     if ($('#' + pageId).find('[data-role="panel"]').length == 0) {

        $('[data-role="header"]').before(menuPanel);
        overlayBind();
     }
}

function overlayBind() {
	
    $('#menuPanel li').click(function() {

        if ($(this).closest('ul').attr('id') != 'mainMenu')
                return;

        sessionStorage.setItem('lastMenuItemId', this.id);

        if (sessionStorage.getItem('lastPanelId') == 'pricelistPanel') {

          if ($(this).hasClass('orderItem')) {

                sessionStorage.removeItem('fromAdvanced');
                sessionStorage.removeItem('fromCategory');

          }

        } else {

          advancedSearchResetStorage();
          sessionStorage.removeItem('cachePricelist');                      
        }

        if ($(this).hasClass('orderItem')) {

          sessionStorage.setItem('currentordertype', $.trim($(this).attr('id').replace('pricelist', '').replace('Item', '')));
        }

        companyLoadPanel(this.id.replace('Item', 'Panel'));

        overlayOnItemClick(this);
    });

    $('#pricelistMenu, #productDetailsMenu').on('click', 'li', function() {

        overlayOnItemClick(this);

        if ('pricelistMenu' == $(this).closest('div').attr('id')) { 

            pricelistDoSearch(this.id);
            sessionStorage.setItem('lastPricelistMenuItemId', this.id);

        } else {

            productdetailShowPanel($(this).text());
        }
    });

    $('#menuPanel a[data-role="button"]').click(function() {

        if ('home' == this.id)
            g_loadMenu();

        overlayRemoveStorage();
    });
}

function overlayRemoveStorage() {
	
        sessionStorage.removeItem('lastMenuItemId');
        sessionStorage.removeItem('lastPricelistMenuItemId');
        sessionStorage.removeItem('lastPanelId');
        sessionStorage.removeItem('fromCategory');
        sessionStorage.removeItem('fromAdvanced');
}

function overlayOnItemClick(item) {
	
    if (item)    
        overlayHighlightMenuItem(item);

    if (g_phonegap || $( window ).width() < 900) 
        $('#menuPanel').panel('close');
}

function overlayHighlightMenuItem(item) {
	
    var $item = ('.orderItem' === item) ? $(item).first() : $(item);			
    $item.addClass('ui-btn-active').siblings('li').removeClass('ui-btn-active');

    if ($item.closest('ul').attr('id') === 'mainMenu')
        sessionStorage.setItem('lastMenuItemId', $item.attr('id'));    
}

function overlaySetMenuButton() {
	
    $('#menuButton').unbind();

     $('#menuButton').attr('data-icon', 'bars').find('.ui-icon').addClass('ui-icon-bars').removeClass('ui-icon-home');
     $('#menuButton').attr('href', '#menuPanel');

     $('#menuPanel').removeClass('invisible');

     overlayOpenMenu();
}

function overlayOpenMenu() {
	
    if (!g_phonegap && $( window ).width() > 900)
        $('#menuPanel').panel('open');
}

function overlaySetMenuItems() {
    
    $('#companyItem, #historyItem, #activityItem').toggleClass('ui-disabled', g_vanSales && g_currentCompany().AccountID.toUpperCase() == g_currentUser().RepID.toUpperCase());
    
    if (g_currentUser().Role) 
        isVan = (g_currentUser().Role.indexOf('canInv') != -1);
    else
        isVan = false;
    
    if ((DaoOptions.getValue('StopOnHoldOrders', false) === 'true') || isVan) {
        var field = DaoOptions.getValue('StopOnHoldField', '');
        var isOnHold = (field && g_currentCompany()[field] === 'Y');
        if (isOnHold) {
            if (!g_companyOnHoldMessageShown) {
                $('#companyInfoPopup p').text(g_companyPageTranslation.translateText(DaoOptions.getValue('StopOnHoldMessage')));
                g_popup('#companyInfoPopup').show(2000, function() {
                    g_companyOnHoldMessageShown = true;
                });
            }            
        }
        
        var disabledTypesCSV = (isOnHold ? DaoOptions.getValue('StopOnHoldOrderType','') : (isVan ? DaoOptions.getValue('ExcludeVanOrderType','') : [])); 
		if (disabledTypesCSV.length > 0) {
        	$.each(disabledTypesCSV.split(','), function(index, orderType) {
            	(orderType === 'Invoice') ? $('.invoiceItem').addClass('ui-disabled') : $('#pricelist' + orderType + 'Item').addClass('ui-disabled'); 
        	})
		};            
    }    
    
    overlayHighlightMenuItem(document.getElementById(sessionStorage.getItem('lastMenuItemId') || 'companyItem'));
    
    if ($('#pricelistMenu').length) {
    	
    	overlayHighlightMenuItem('#basic');    	    	
    	$('#pricelistMenu').toggle($('#pricelistPanel').is(':visible'));
    }
    
    if ($('#productDetailsMenu').length) {
    	
    	$('#productDetailsMenu').toggle($('#productDetailPanel').is(':visible'));
    	overlayHighlightMenuItem('#price');
    }
}

function overlayFetchOrderTypes() {
	
	if (g_currentUser().Role) {	
		
		var roles = g_currentUser().Role.split(',');	
		
		for (var i = 0; i < roles.length; ++i) {
			
			var orderTypes = DaoOptions.getValue(roles[i] + 'OrderTypes');
		
			if (orderTypes)
				return orderTypes.split(',');
		}
		
		return overlayFetchMobileOrderTypes();
		
	} else {
		
		return overlayFetchMobileOrderTypes();
	}
}

function overlayFetchMobileOrderTypes() {
	
	var orderTypes = DaoOptions.getValue('MobileOrderTypes');
	return orderTypes ? orderTypes.split(',') : [];
}