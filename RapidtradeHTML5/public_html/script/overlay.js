function overlayInit(page) {
	
	var menuPanel = '<div data-role="panel" data-dismissible="false" id="menuPanel" class="overlayMenu invisible" data-theme="b">';
	
	if (g_currentUser().Role != 'CUST') {
		
		menuPanel += '<ul id="mainMenu" data-role="listview" data-inset="true" data-divider-theme="d" >' +
							'<li data-role="list-divider" role="heading">Main Menu</li>' +
						 	'<li id="companyItem">Company Details</li>' +
						 	'<li id="historyItem">Customer History</li>';
		
		if (!g_vanSales) {
			
	    	var orderTypes = overlayFetchOrderTypes();
	    	
			//Check if we can invoice, then add order types
			if (g_currentUser().Role) {
				
				if (g_currentUser().Role.indexOf('canInv') != -1) {		
					
					var warehouses = ((g_currentUser().Role.split(',')[1]).split('=')[1]).split('|');
					$.each(warehouses, function(key, value) {   
						
					     orderTypes.push('Invoice-' + value);
					});				
				}
			}
			
			if (orderTypes.length) {
				
				if (!((orderTypes.length == 1) && (orderTypes[0].toLowerCase() == 'none')))
			
					$.each(orderTypes, function(key, value) {   
						
						menuPanel += '<li id="pricelist' + value + 'Item" class="orderItem">Create ' + value + '</li>';
					});
				
			} else {
				
				menuPanel += '<li class="orderItem">Create Order</li>';
			}
			
		} else {
			
			menuPanel += '<li class="orderItem">Create Order</li>';
		}	
		
		menuPanel += 	'<li id="activityItem">Add Activity</li>' +
					 '</ul>';
	}
		
//	if (DaoOptions.getValue('ShowProductInfo') == 'true') {
//		
//		menuPanel += '<div id="productDetailsMenu"><h3>Product Details</h3>' +
//						'<ul data-role="listview" data-inset="true">' +
//							'<li>Price</li>' +
//							'<li>Product Info</li>' +
//						'</ul>' +
//					'</div>';
//	}
	
	var showPricelistMenu = (DaoOptions.getValue('MobileCategories') == 'true') || (DaoOptions.getValue('AllowAdvancedSearch') == 'true');
	
	if (showPricelistMenu) {

		menuPanel += '<div id="pricelistMenu">' +   
						'<ul data-role="listview" data-inset="true" data-divider-theme="d" >' +
							'<li data-role="list-divider" role="heading">Pricelist</li>' +
							'<li id="basic" class="ui-btn-active">Basic Search</li>';
	
		var pricelistMenuEnd = '</ul></div>';
		
		if (DaoOptions.getValue('MobileCategories') == 'true')			
                    menuPanel += '<li id="categories">Product Categories</li>';

		if (DaoOptions.getValue('AllowAdvancedSearch') == 'true') {
		
                    menuPanel += '<li id="advanced">Advanced Search</li>';

                    if (DaoOptions.getValue('extrasearch')) {

                        var extraMenuItemArray = JSON.parse(DaoOptions.getValue('extrasearch'));

                        for ( var i = 0; i < extraMenuItemArray.length; i++)
                                menuPanel += '<li id="' + extraMenuItemArray[i].search + '">' + extraMenuItemArray[i].label + '</li>';
                    }	 
			
                    menuPanel += pricelistMenuEnd;

                    if (DaoOptions.getValue('ShowProductInfo') == 'true') {

                        menuPanel += '<div id="productDetailsMenu">' +
                                        '<ul data-role="listview" data-inset="true" data-divider-theme="d">' +
                                            '<li data-role="list-divider" role="heading">Product Details</li>' +
                                            '<li id="price" class="ui-btn-active">Price</li>' +
                                            '<li>Product Info</li>'; 

                        if (DaoOptions.getValue('ShowComponents') === 'true')
                            menuPanel += '<li>Components</li>';

                        if (DaoOptions.getValue('ShowAlternate') === 'true')
                            menuPanel += '<li>Alternative Products</li>';

                        if (DaoOptions.getValue('ShowWhereUsed') === 'true')
                            menuPanel += '<li>Where Used</li>';

                               menuPanel += '<li>Technical Info</li>' +
                                            '<li>Large Image</li>' +
                                    '</ul>' +
                            '</div>';
                    }
			
		} else {
			
                    menuPanel += pricelistMenuEnd;
		}
	}
	
	if (g_currentUser().Role != 'CUST') 
		menuPanel += '<a data-role="button" href="myterritory.html" data-icon="search" data-theme="b">My Customers</a>';
	
	menuPanel += '<p><a id="home" data-role="button" data-icon="home" data-theme="e">Home</a>';
			
	menuPanel += '</p></div>';
	
	 if ($(page).find('[data-role="panel"]').length == 0) {
		 
		  $('[data-role="header"]').before(menuPanel);
		  overlayBind();
	 }
}

function overlayBind() {
	
	  $('#menuPanel li').click(function() {
		  
		  if ($(this).closest('ul').attr('id') != 'mainMenu')
			  return;
		  
		  companyLoadPanel(this.id.replace('Item', 'Panel'));		  
		  sessionStorage.setItem('lastMenuItemId', this.id);
		  
		  if (sessionStorage.getItem('lastPanelId') == 'pricelistPanel') {
			  
			  if ($(this).hasClass('orderItem')) {
				  
				  sessionStorage.removeItem('fromAdvanced');
				  sessionStorage.removeItem('fromCategory');
			  }			  
		  }
		  
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
	  
	  $('.orderItem').click(function() {
		  
		  if (sessionStorage.getItem('lastPanelId') != 'pricelistPanel') {
			  
			  advancedSearchResetStorage();
			  sessionStorage.removeItem('cachePricelist');
		  }
		  
		  sessionStorage.setItem('currentordertype', $.trim($(this).text().replace('Create ', ''))); 		  
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
	
	(g_phonegap || $( window ).width() < 900) ? $('#menuPanel').panel('close') : overlayHighlightMenuItem(item);
}

function overlayHighlightMenuItem(item) {
	
	var $item = ('.orderItem' == item) ? $(item).first() : $(item);			
	$item.addClass('ui-btn-active').siblings('li').removeClass('ui-btn-active');
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