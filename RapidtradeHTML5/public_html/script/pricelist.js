var g_pricelistSelectedProduct = {ItemIndex: -1};
var g_pricelistView = 'pricelist';
var g_pricelistItems = [];

var g_pricelistMobileLiveStockDiscount = false;
var g_pricelistCanChangeDiscount = false;
var g_productDetailInitialized = false;
var g_pricelistVolumePrices = [];
var g_pricelistMultiWarehouses = {};
var g_pricelistIsAnyItemAdded = false;
var g_lastScrollPosition = 0;
var g_pricelistSearchPricelistText = '';
var g_numItemsPerPage = 100;
var g_pricelistScrollto = false;

var g_pricelistCaptureQuantityClicked = false;
var g_pricelistMultiWarehouseClicked = false;
var g_pricelistInvoiceWarehouse = '';
var g_pricelistIsPrevNextPressed = false;
var g_pricelistRetryCount = 0;

/**
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */

function pricelistOnPageShow() {    
    
    if (sessionStorage.getItem('clearSearch')) {
        
        $('#search').val('');
        g_pricelistSearchPricelistText = '';
        sessionStorage.removeItem('cachePricelist');
        sessionStorage.removeItem('clearSearch');
    }
    
    var templateArray = DaoOptions.getValue('MyRangeUF') && g_currentCompany()[DaoOptions.getValue('MyRangeUF')].split(',') || [];
    
    if (templateArray.length) {
        
//        $('#chooseTemplate').removeClass('ui-disabled');        
        
        templateArray.unshift('None');        
        var lastSelectedType = sessionStorage.getItem('lastRangeType');                
        
        var templatesHTML = '<li data-role="divider" data-theme="e">Choose Template</li>';

        $.each(templateArray, function(index, value) {
            
            templatesHTML += '<li><a onclick="pricelistSelectTemplate(\'' + value + '\')">' + value + '</a></li>';
        });                
        
        $('#popupCategory ul').html(templatesHTML).listview('refresh');        
        $('#search').textinput(lastSelectedType === 'None' ? 'enable' : 'disable');                
    }
    
    if (DaoOptions.getValue('VanandWareOrder', 'false') === 'true')
        sessionStorage.removeItem('cachePricelist');
    
    $('#search').val(pricelistIsCheckWarehouseEnabled() ? '' : g_pricelistSearchPricelistText);
    $('#search').attr('placeholder', g_companyPageTranslation.translateText('Search for products'));
	        
    pricelistHideFooter();
    overlaySetMenuItems();

    pricelistOnPageShowSmall();	
    g_showCurrentCompanyName();
	
    var isAdvancedSearchAllowed = (DaoOptions.getValue('AllowAdvancedSearch') === 'true');
    if (isAdvancedSearchAllowed) {
    	$('#pricelistMenu').show();
    	$('#productDetailsMenu').hide();
    }
    
    try {
    	g_numItemsPerPage = parseInt((DaoOptions.getValue('MobilePricelistNumbEntry', 50)).split(',')[0], 10);
    } catch(err){
    	g_numItemsPerPage = 150;
    }
    
    
    $('.prev .ui-btn-text').text('Previous ' + g_numItemsPerPage);
    $('.next .ui-btn-text').text('Next ' + g_numItemsPerPage);
    
    pricelistBind();
	
    sessionStorage.setItem('ShoppingCartReturnPage', 'pricelist');
    //$('#scanbarcode').toggle(g_scandit);
    //$('#pricelistQuantityDiv').toggle(DaoOptions.getValue('AllowPriceQuickCapt') != 'true');
    g_pricelistIsAnyItemAdded = false;
    $('.phoneonly').toggle(g_builtInScanner || pricelistIsSGScan());
    $('.hidden').removeClass('hidden');
    $('#NextPrevButtons').hide();
    $('#NextPrevButtonsTop').toggle(DaoOptions.getValue('mobileplnexttop') == 'true');
    $('#barcodescanned').hide();
    g_productDetailInitialized = false;

    if (g_currentUser().Role && (g_currentUser().Role.toUpperCase().indexOf('CUST') != -1)) {
        g_pricelistCanChangeDiscount = false;
//    } else if (g_currentUser().IsAdmin && DaoOptions.getValue('localTPM') === 'true') {
//        g_pricelistCanChangeDiscount = true;
    } else {
        g_pricelistCanChangeDiscount = (DaoOptions.getValue('CanChangeDiscount', '').toLowerCase() === 'true') || g_userCanChangeDiscount();
    }
    
    $('#scanbarcodetd').toggleClass('invisible', !g_scandit);
    $('#advancedButton').toggleClass('invisible', !isAdvancedSearchAllowed);   
    $('#advancedSearchClearButton').toggle(DaoOptions.getValue('AllowAdvancedFilter') == 'true');
    $('.productDetailsMenuButton').toggle(isAdvancedSearchAllowed);
    $('#zoomInButton, #zoomOutButton').toggle(!isAdvancedSearchAllowed);
    
    if (isAdvancedSearchAllowed && !sessionStorage.getItem('advancedLevel')) {
    	
        sessionStorage.setItem('advancedLevel', DaoOptions.getValue('LiveAdvanceSearch') ? 1 : 0);
        sessionStorage.setItem('advancedParentId', 'ADVANCED');
        sessionStorage.setItem('advancedTip', 'null');
    }
    
    if ((DaoOptions.getValue('MobileCategories') == 'true') && !sessionStorage.getItem('categoriesLevel')) {
    	
        sessionStorage.setItem('categoriesLevel', '0');
        sessionStorage.setItem('categoriesParentId', 'PC');
        sessionStorage.setItem('categoriesTip', 'null');
        $('#tocategoriesBtn').show();
    }
    
    if ($('#barcodetoggle').is(':visible')) {
    	
	    $('#barcodetoggle').val(sessionStorage.getItem('currentsearchmode')).slider('refresh');
	    barcodeToggleOnChange(); 
    }
    
    if (!sessionStorage.getItem('currentordertype'))
        sessionStorage.setItem('currentordertype', 'Order');
    
    if (!pricelistFromCache(g_currentCompany().Pricelist, g_currentCompany().SupplierID, g_currentCompany().AccountID)) {
        var dao = new Dao();
        dao.openDB(function () { pricelistInit(); });        
    }
    
    if (DaoOptions.getValue('AllowAdvancedFilter') == 'true') {
    	
    	if ($('#filterForm :input').length == 0) {
    	
            var jsonForm = new JsonForm();
            jsonForm.show(g_currentUser().SupplierID, '#filterForm', {}, 'AdvSearch');
    	}
		
    } else {
    	
        $('#advancedSearchPanel .ui-block-a').css('width', '100%');
        $('#advancedSearchImageButton').hide();
    }
    $('#search').focus();
}

function pricelistOnPageShowSmall() {
	
	if (g_isScreenSmall()) {
		
            $('.hideonphone').hide();
            $('#pricelists').attr('data-inset','false');
	}
}

function pricelistHideFooter() {
	
	if (sessionStorage.getItem('PricelistNoFooter') == 'true') {
		
            $('#pricelistFooter, #backbtn').hide();
            $('#companyNextButton').show();
	}
}

function pricelistSelectTemplate(template) {
    
    $('#search').val('');
    sessionStorage.setItem('lastRangeType', template);
    $('#popupCategory').popup('close');
    pricelistFetchPricelist();

}

function pricelistOnBackButtonClick() {
	
    $('.productimage').hide();
    
    if (sessionStorage.getItem("currentordertype")=="repl" && g_vanSales && g_pricelistView == 'pricelist') {  
    	
        g_loadMenu();
        
    } else if (sessionStorage.getItem("currentordertype") == "stock" && g_vanSales && g_pricelistView == 'pricelist') {
    	
        g_loadMenu();
        
    } else if (g_pricelistView == 'detail') {
    	
    	if (sessionStorage.getItem('fromCategory') == 'true')
            g_companyPageTranslation.translateButton('#backbtn', 'Categories');
    	else if (sessionStorage.getItem('fromAdvanced') == 'true')
            g_companyPageTranslation.translateButton('#backbtn', 'Advanced Search');
    	else
            $('#backbtn').hide();    		

    	pricelistHideFooter();
    	g_pricelistView = 'pricelist';
    	$('#pricelistPanel, #searchBarPanel').show();        	
    	$('#productDetailPanel').hide();
    	$('#pricelistMenu').show();
    	$('#productDetailsMenu').hide();
    	$('#productInfoPanel').hide();
    	$('#componentsPanel').hide();
    	$('#technicalInfoPanel').hide();
    	$('#largeImagePanel').hide();
    	$(window).scrollTop(g_lastScrollPosition);
    	
        if (sessionStorage.getItem('currentsearchmode') == 'scan') {
        	
        	$('#search').val('');
        	$('#search').focus();
        }
        
        if (DaoOptions.getValue('resetsearch','false') == 'true') {
        	
           	$('#search').val('');	
        }
        
        if (!g_deviceVersion) {
            $('#search').focus();
        }
        
//        if (productdetailsAdminCanAddPromo() && g_pricelistSelectedProduct.Type === 'PROMOADMIN') {
//            pricelistDoSearch(); // pricelistFetchPricelist();
//        }
        
    } else if (sessionStorage.getItem('fromCategory') == 'true') {
    	
    	pricelistDoSearch('categories');
        g_companyPageTranslation.translateButton('#backbtn', 'Back');
    	$('#backbtn').hide();
    	
    } else if (sessionStorage.getItem('fromAdvanced') == 'true') {
    	
    	pricelistDoSearch('advanced');
        g_companyPageTranslation.translateButton('#backbtn', 'Back');
    	$('#backbtn').hide();    	
    	
    } else if ($('#advancedSearchPanel').is(':visible')) {
    	
        $('#advancedSearchPanel').hide();
        $('#pricelistPanel, #searchBarPanel').show();		
    }
}

function pricelistScrollTo(id) {
	try {
		if (!sessionStorage.getItem('expandcategory')) return;
		//if (sessionStorage.getItem('pricelistsearchtxt') == '') return;
		$('html,body').animate({scrollTop: $("."+id).offset().top - 50},'fast');	
		sessionStorage.removeItem('expandcategory');
	} catch (err) {
		console.log(err.message);
	}
}

function pricelistBind() {
	
    (DaoOptions.getValue('AllowAdvancedSearch') != 'true') && (DaoOptions.getValue('MobileCategories') != 'true') ?  g_menuBind() : overlaySetMenuButton();

    $('#backbtn').unbind();
    $('#backbtn').click(pricelistOnBackButtonClick);
    
    $("#search").unbind();
    $("#search").keypress(function (event) {
            var keycode = (event.keyCode ? event.keyCode : event.which);
            if (keycode == '13') {
                
                sessionStorage.removeItem('lastRangeType');
            	
            	if ((DaoOptions.getValue('LiveAdvanceSearch') && $('#pricelistMenu #advanced').hasClass('ui-btn-active'))) {
            		
            		if ($.trim($(this).val()) != '') {
            			
            			$('#pricelistInfoDiv').hide().addClass('invisible');
            			$('#pricelistPanel').hide();	
            			$('#advancedSearchList, #breadcrumb').empty();
        				$('#advancedSearchPanel').show();
        				
        				advancedSearchCurrentLevel(1);
            			advancedSearchFetchLevelLive();
            		}
            		
            	} else {
            		
                	pricelistShowExpandCategory(true);
                	pricelistBasicSearch();	
            	}
            }
    });

    $("#expandcategory").unbind();
    $("#expandcategory").click(function (event) {
    	sessionStorage.setItem('expandcategory','true');
    	categories.getInstance().showPopup('#ulCategories', '#popupCategory');
    });
    
    $('#chooseTemplate').off().on('click', function() {
       
       myRangeField = DaoOptions.getValue('MyRangeUF');
       
       if (myRangeField && g_currentCompany()[myRangeField].split(',').length)
            $('#popupCategory').popup('open');
        else
            pricelistSelectTemplate('MyRange');
    });

    $("#scrolltop").unbind();
    $("#scrolltop").click(function (event) {
    	$('html,body').animate({scrollTop: $(".image").offset().top - 50},'fast');	
    });
    
    $("#resetsearch").unbind();
    $("#resetsearch").click(function (event) {
    	pricelistShowExpandCategory(false);
    	$("#search").val(''); 
    	$('#search').focus();
    });
    
    
    $(".next, .prev").unbind();
    $(".next, .prev").click(function () {
        
        g_pricelistIsPrevNextPressed = true;
        
    	$('#productimagebig').attr('src', '');
    	$('.productimage').attr('src', '');
        if ($(this).hasClass('next')) {
            if (g_pricelistItemsOnPage - g_numItemsPerPage == 0/*(DaoOptions.getValue('MobileOnlinePricelist') == 'true') || (g_pricelistNumerOfIteminPricelist - (g_pricelistCurrentPricelistPage * 50) > 0)*/) {
                g_pricelistCurrentPricelistPage++;
                g_pricelistNumerOfIteminPricelist = 0;
                g_pricelistItemsOnPage = 0;
                pricelistFetchPricelist();
            }
        } else {
            if (g_pricelistCurrentPricelistPage > 1) {
                g_pricelistCurrentPricelistPage--;
                g_pricelistNumerOfIteminPricelist = 0;
                g_pricelistItemsOnPage = 0;
                pricelistFetchPricelist();
            }
        }
    });
    
    $('#okbtn').unbind();
    $('#okbtn').click(function () {
    	productdetailOkClicked();
    });

    $("#quantity").unbind();
    $("#quantity").keypress(function (event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);

        if (keycode == '13') {
            $('#okbtn').click();
        }
    });
    
    $('#quantity').keydown(function (event) {
    	return g_isValidQuantityCharPressed(event);
    });
    
    $('.productImageZoomButton').unbind();
    $('.productImageZoomButton').click(function () {   
        var occupiedPageHeight = 230;
        var size = (innerHeight - occupiedPageHeight < innerWidth ? innerHeight - occupiedPageHeight : innerWidth);
        $('#loadImage').show();
        $('#loadImage').height(size);
        $('#productimagebig').hide();
    	productdetailToggleViews();
    });
    
    $('#prevProductButton, #nextProductButton').unbind();
    $('#prevProductButton, #nextProductButton').click(function () { 
        var followingItemIndex = parseInt(g_pricelistSelectedProduct.ItemIndex) + (($(this).attr('id') == 'prevProductButton') ? -1 : 1);
        if (followingItemIndex >= 0 && followingItemIndex < g_pricelistItems.length) {
            var occupiedPageHeight = 230;
            var size = (innerHeight - occupiedPageHeight < innerWidth ? innerHeight - occupiedPageHeight : innerWidth);
            $('#loadImage').show();
            $('#loadImage').height(size);
            $('#productimagebig').hide();
        }
        pricelistOnItemClicked(followingItemIndex);
    });
    
    $('#savevalue').unbind();
    $('#savevalue').click(function() {
    	productdetailSaveValue();
    }); 
    
    $('.pricelistInput').unbind();
    $('.pricelistInput').keydown(function(event) {  
        
    	var isEnterPressed = (13 == event.keyCode);   	
    	if (isEnterPressed) {
            
            event.stopPropagation();
            productdetailSaveValue();
            $('#valuePopup').popup('close');
        }
    });
    
    $('#barcodetoggle').unbind();
    $('#barcodetoggle').change(function () {	
    	
        sessionStorage.setItem('currentsearchmode', $(this).attr('value'));
    	barcodeToggleOnChange();
    });
    
    $('#includeCategoryToggle').unbind();
    $('#includeCategoryToggle').change(function () {	  	
        localStorage.setItem('includeCategoryToggle', $(this).attr('value'));
    });
    
    
    $('#advancedButton').unbind();
    $('#advancedButton').click(function() {
    	
    	advancedSearchFetchLevel();
    });
    
    $('#advancedSearchBackButton').unbind();
    $('#advancedSearchBackButton').click(function() {
    	
    	advancedSearchOnBackButtonClicked();
    });
    
    $('#advancedSearchButton').unbind();
    $('#advancedSearchButton').click(function() {
    	
    	advancedSearchOnSearchButtonClicked();
    });
    
    $('#advancedSearchClearButton').unbind();
    $('#advancedSearchClearButton').click(function() {
    	document.getElementById('filterForm').reset();
    });
    
    $('#categoriesButton').unbind();
    $('#categoriesButton').click(function() {
    	pricelistDoSearch('categories');
    });    
    
    /*
    $("#pricelistPanel").on( "swiperight", function() {
    	pricelistDoSearch('categories');
    } );
    */
    
    $('#imagePopup').unbind();
    $('#imagePopup').click(function() {
    	$(this).popup('close');
    });
    
    // Scandit barcode scanner
    if (g_scandit) {
        $('#scanbarcode').click(function() {
            
            cordova.exec(pricelistOnScanSuccess, pricelistOnScanFailure, "ScanditSDK", "scan",
                         ["Un6c+ApaEeOS29OhyJ6xHZFTdWQTTpNtNDPafIwE5BI",
                          {"beep": true,
                          "1DScanning" : true,
                          "2DScanning" : true,
                          "scanningHotspot" : "0.5/0.5",
                          "vibrate" : true,
                          "textForInitialScanScreenState" : "Align code with box",
                          "textForBarcodePresenceDetected" : "Align code and hold still",
                          "textForBarcodeDecodingInProgress" : "Decoding",
                          "searchBarActionButtonCaption" : "Go",
                          "searchBarCancelButtonCaption" : "Cancel",
                          "searchBarPlaceholderText" : "Scan barcode or enter it here",
                          "toolBarButtonCaption" : "Cancel",
                          "minSearchBarBarcodeLength" : 8,
                          "maxSearchBarBarcodeLength" : 15}]);
           });
        
        $('#savequantity').click(function() {
                                 
                                 pricelistFetchBarCode();
                              });
        
        $('#quantityPopup').popup({
                                 afteropen: function( event, ui ) {
                                 
                                    $('#quantity-w').val('2');
                                    $('#quantity-w').focus();
                                 }
                                 });
        
        $('#quantity-w').keydown(function(event) {
                                     var isEnterPressed = (13 == event.keyCode);
                                     if (isEnterPressed)
                                     $('#savequantity').click();
                                     });
    }
    
    /***
     * on each initialization of the page we want our variables reset
     */
    g_keyMap = [];
    g_keyMatchCount = 0;
    onkeydown = function(e) {
        e = e || event; // to deal with IE
        g_keyMap[e.keyCode] = e.type === 'keydown';
        
        // we these listeners active only on shopping cart page
        if($.mobile.activePage.attr('id') === 'companypage'  && g_pricelistView === 'pricelist' && g_keyMap[17]) { 
            /*if (g_keyMap[66]){ // CTRL+B
               g_keyMap = [];
                // avoid calling checkout more than once
                if (g_keyMatchCount++ === 0) {
                    setTimeout(function () {
                        sessionStorage.removeItem('shoppingCartViewType');
                        shoppingCartOnBack(); 
                    },500); 
                    return false;
                } 
            } else */
            if (g_keyMap[83]){ // CTRL+S
                g_keyMap = [];
                // avoid calling checkout more than once
                if (g_keyMatchCount++ === 0) {
                    setTimeout(function () {
                       $('#companyNextButton').click(); 
                    },500); 
                    return false;
                }
            }
        }
    };
    
    onkeyup = onkeydown;
}

function pricelistInit() {
	
	//Initialise variables
    g_pricelistCurrentPricelistPage = 1;
    g_pricelistNumerOfIteminPricelist = 0;
    g_pricelistItemsHtml = '';
    g_pricelistItemsOnPage = 0;
    
    //Initialise forms
    
    if (sessionStorage.getItem('fromCategory') == 'true') {
        g_companyPageTranslation.translateButton('#backbtn', 'Categories');
    	$('#backbtn').show();
    	pricelistShowExpandCategory(false);
    }
    
    
    if (sessionStorage.getItem('fromAdvanced') == 'true') {
        g_companyPageTranslation.translateButton('#backbtn', 'Advanced Search');
    	$('#backbtn').show();
    }
    
    //other
    if (g_vanSales && g_currentCompany().AccountID.toUpperCase() == g_currentUser().RepID.toUpperCase()) {
        $('#historyTab').hide();
        $('#companyTab').hide();
        $('#activityTab').hide();
        if (sessionStorage.getItem("currentordertype") == "repl")
        	$('#pagelabel').text('Replenish');
        else if (sessionStorage.getItem("currentordertype") == "stock")
            $('#pagelabel').text('Stock Take');
    }
    
    /*
    if (DaoOptions.getValue('includeCategoryToggle', 'false') == 'true') {
		$('#includeCategoryToggle').val(localStorage.getItem('includeCategoryToggle'));
		$( '#includeCategoryToggle' ).slider( 'refresh' );
		//TODO take this out
		//$('#includeCategoryDiv').show();	
	}  else
    	$('#includeCategoryDiv').attr('class','invisible');
    	*/
	
    if (!pricelistShowPricelist()) return;
    
    pricelistSkip = 0;
    pricelistFetchPricelist();
    pricelistCheckBasket();
    try {
    	$('#search').trigger('create');
    	//$( "#search" ).textinput( "refresh" );
    } catch (err) {
    	console.log(err.message);
    }	
}

function pricelistShowExpandCategory(show){
	if ((DaoOptions.getValue('MobileCategories',false) == 'false')) return; 
	if (show) {
		$('#expandcategory').removeClass('ui-disabled');
		sessionStorage.removeItem('expandcategory');		
	} else {
		$('#expandcategory').addClass('ui-disabled');
		sessionStorage.removeItem('expandcategory');		
	}
}

function pricelistShowPricelist() {
	
    var showPricelist = (sessionStorage.getItem('fromAdvanced') == 'true') || (sessionStorage.getItem('fromCategory') == 'true') || (DaoOptions.getValue('MobileOnlinePriceNoSearch') != 'true');
    
	$('#pricelists').toggle(showPricelist);
	$('#pricelistInfoDiv').toggle(!showPricelist);
	
	return showPricelist;
}


function pricelistDoSearch(searchType) {
	
	$('#backbtn').hide();
	$('#search').attr('placeholder', g_companyPageTranslation.translateText('Search for products'));
	
	overlayHighlightMenuItem('#' + searchType);
	
        sessionStorage.removeItem('onlinePricelistCategory');
	sessionStorage.removeItem('fromCategory');
	sessionStorage.removeItem('fromAdvanced');
	
	if (((searchType != 'advanced') || (DaoOptions.getValue('LiveAdvanceSearch')) && $('#advancedSearchPanel').is(':visible'))) {
		
		g_advancedSearchProducts = [];
		g_advancedSearchFilter = {};
		$('#advancedSearchPanel').hide();
		$('#pricelistPanel, #searchBarPanel').show();
	}
	
	$('#advancedSearchButton').toggle('advanced' == searchType);	
	
	var isLiveAdvancedSearch = (searchType == 'advanced') && (DaoOptions.getValue('LiveAdvanceSearch', '') != '');
	
	$('.rtTableLabel').toggle(!isLiveAdvancedSearch);
	
	switch (searchType) {
	
		case 'basic':		
			
                    $('#search').attr('value', '');
                    pricelistBasicSearch();	
                    break;
			
		case 'categories':
		case 'advanced':
                    
                    var isFilterEnabled = ('advanced' == searchType) && (DaoOptions.getValue('AllowAdvancedFilter') == 'true');
                    
                    var blockAWidthPercents = isFilterEnabled ? 50 : 100;
                    $('#advancedSearchPanel .ui-block-a').css('width', blockAWidthPercents + '%');
                    $('#advancedSearchPanel .ui-block-b').css('width', 100 - blockAWidthPercents + '%');                    
                    $('#advancedSearchClearButton').toggle(isFilterEnabled);
			
                    $('#search').val('');			
                    $('#searchBarPanel').toggle(isLiveAdvancedSearch);

                    if ((searchType == g_advancedSearchType) && $('#advancedSearchList li').length) {

                            $('#pricelistPanel').hide();								
                            $('#advancedSearchPanel').show();
                            $('#advancedSearchBackButton .ui-btn-text').text(advancedSearchIsTopLevel() ? 'Basic Search' : 'Back');

                            if (('advanced' == searchType) && DaoOptions.getValue('LiveAdvanceSearch')) {

                                $('#search').attr('placeholder', 'Search for models');
                                $('#search').val(advancedSearchGetItem('lastLiveSearch'));
                                $('#NextPrevButtons').hide();
                                $('#alphafilter').hide();
                            }


                    } else if (('advanced' == searchType) && DaoOptions.getValue('LiveAdvanceSearch')) {								

                            $('#search').attr('placeholder', 'Search for models');
                            $('#NextPrevButtons').hide();
                            $('#alphafilter').hide();
                            $('#advancedSearchList').empty();
                            $('#breadcrumb').text('');
                            advancedSearchCurrentLevel() ? advancedSearchFetchLevelLive() : advancedSearchInit('advanced');

                            $.mobile.hidePageLoadingMsg();

                    } else {

                            advancedSearchFetchLevel(searchType);
                    }

                    break;
			
		default:	
			
                    $('#search').attr('value', searchType);
                    pricelistBasicSearch();
                    break;
	}	
}

function pricelistBasicSearch() {
	
    if (!$('#pricelists').is(':visible')) {
            $('#pricelistInfoDiv').hide();
            $('#pricelists').show();
    }	

    if (sessionStorage.getItem('currentsearchmode')=='scan') {
            pricelistFetchBarCode(); 
    } else {
    g_pricelistItemsOnPage = 0;
    g_pricelistCurrentPricelistPage = 1;
    $('#backbtn').hide();
    sessionStorage.removeItem('advancedsearch');
    sessionStorage.removeItem('fromAdvanced');
    sessionStorage.removeItem('fromCategory');
    pricelistFetchSearchText();	
    categories.getInstance().init();
    pricelistFetchPricelist();  
    $('#search').blur();
    }
}

function pricelistCategorySearch(category) {
	g_pricelistSearchPricelistText = /*'"' +*/ category /*+ '"'*/;
	pricelistFetchPricelist(); 
    if (sessionStorage.getItem('fromCategory') == 'true') {
        g_companyPageTranslation.translateButton('#backbtn', 'Categories');
    	$('#backbtn').show();
    	pricelistShowExpandCategory(false);
    }

}


function pricelistFetchSearchText(){
    //remember previous searches and put in placeholder for reference
    try {
    	if (sessionStorage.getItem('advancedsearch')) {
    		g_pricelistSearchPricelistText = '"' + sessionStorage.getItem('advancedsearch') + '"';
    		sessionStorage.removeItem('advancedsearch');
    	} else if (sessionStorage.getItem('expandcategory')){
    		g_pricelistSearchPricelistText = sessionStorage.getItem('pricelistsearchtxt') ;
    	} else {
    	   	g_pricelistSearchPricelistText = $('#search').attr('value');
            if (g_pricelistSearchPricelistText == '' && sessionStorage.getItem('pricelistsearchtxt')) {
            	g_pricelistSearchPricelistText = sessionStorage.getItem('pricelistsearchtxt');
            } else {
            	sessionStorage.setItem('pricelistsearchtxt',g_pricelistSearchPricelistText );
            }         		
    	}
    } catch (err){
    	console.log(err.message);
    }	
}

function barcodeToggleOnChange() {
	
	$('#barcodescanned').hide();
    $('#search').val('');
    $('#search').focus();
}

function pricelistIsSGScan() {
	try {
	    var role = g_currentUser().Role.toLowerCase();   
		return ((role.indexOf('vansales') != -1) && (role.indexOf('builtinscan') != -1));		
	} catch (err){
		return false;
	}
}


function pricelistIsQuickCaptureEnabled() {
	return DaoOptions.getValue('MobileQuickCapture') == 'true';
}

// Scandit barcode scanner

function pricelistOnScanSuccess(resultArray) {

    $("#search").val(resultArray[0]);
    $( "#quantityPopup" ).popup("open");
}

function pricelistOnScanFailure(error) {
    
    alert("Failed: " + error);
}


function pricelistCheckBasket(setOverlay) {
    
    if (setOverlay === undefined)
        setOverlay = true;
	
    var dao = new Dao();
    dao.count('BasketInfo', g_currentCompany().AccountID, 'index1',
    function (cnt) {        	
        $('#companyNextButton').removeClass('ui-disabled');        
        $('#companyNextButton .ui-btn-text').text('(' + cnt + ')' + ' ' +  g_companyPageTranslation.translateText('Shopping Cart'));
        isBaksetEmpty = false;
        g_pricelistIsAnyItemAdded = true;
        
        if (setOverlay)
            overlaySetMenuItems();
    }, function() {
        g_pricelistIsAnyItemAdded = false;
        $('#companyNextButton').addClass('ui-disabled');
        g_companyPageTranslation.translateButton('#companyNextButton', 'Shopping Cart');
    });
}


function pricelistFetchPricelist() {	
    pricelistLoadBasket();
}

/*
 * Only needed for indexedDB or online search to quickly get shopping cart
 * this.sqlFetchPricelist returns basket quantity
 */
function pricelistLoadBasket() {

    if (!g_indexedDB && (DaoOptions.getValue('MobileOnlinePricelist') !== 'true') && (!pricelistIsRangeSelected()) && (DaoOptions.getValue('CanDoNonStock') !== 'true')) {
            pricelistFetchPricelistJob();
            return;
    } else {		    
        var dao = new Dao();
        var i = 0;
        g_pricelistCurrentBasket = [];

        dao.cursor('BasketInfo', undefined, undefined,
        function (basketinfo) {
            if ((basketinfo.AccountID == g_currentCompany().AccountID) /*&& (basketinfo.Type == sessionStorage.getItem("currentordertype"))*/) {
                g_pricelistCurrentBasket[i++] = basketinfo;
            }
        }, undefined,
        function (event)  {
            pricelistFetchPricelistJob();
        }
        );
    }
}

function pricelistFetchTemplateItems() {    
    
//    g_busy(true);
    
    if (g_indexedDB) {
        
        onLocalFetchFailure();
        
    } else {
        
        var dao = new Dao();   
        dao.fetchTemplateItems(sessionStorage.getItem('lastRangeType')/*.replace('TE_', '')*/, onLocalFetchSuccess, onLocalFetchFailure, pricelistOnComplete);    
    }
   
    function onLocalFetchSuccess(pricelist) {
        
        var newPricelist = {};

        newPricelist.b = pricelist.Barcode;
        newPricelist.cn = pricelist.CategoryName;
        newPricelist.des = pricelist.Description;
        newPricelist.d = pricelist.Discount;
        newPricelist.g = pricelist.Gross;
        newPricelist.n = pricelist.Nett;
        newPricelist.Stock = pricelist.Stock;
        newPricelist.id = pricelist.ProductID;
        newPricelist.u = parseInt(pricelist.Unit, 10);
        newPricelist.u1 = pricelist.UserField01;
        newPricelist.u2 = pricelist.UserField02;
        newPricelist.u3 = pricelist.UserField03;
        newPricelist.u4 = pricelist.UserField04;
        newPricelist.u5 = pricelist.UserField05;

        pricelistOnSuccessRead(newPricelist);         
    }
    
    function onLocalFetchFailure(error) {
        
//        g_busy(true);    
        if (g_isOnline() && ($('#mode').val() === 'Online')) {
            var url = DaoOptions.getValue('MyRangeURL', g_restUrl) + '/Orders/GetOrderItemsByType3?supplierID=' + g_currentUser().SupplierID + '&accountID=' + g_currentCompany().AccountID.replace('&', '%26') + 
                    '&userID=' + g_currentUser().UserID + '&orderType=' + sessionStorage.getItem('lastRangeType') + '&skip=0&top=300'; 

            console.log(url);
            g_ajaxget(url, onRemoteFetchSuccess, onRemoteFetchFailure);
        } else {
            pricelistOnComplete();
        }
    }  
    
    function onRemoteFetchSuccess(json) {
        
        if (json.length) {
            
            g_busy(true);
            g_syncDao = g_syncDao || new Dao();

            syncSaveToDB(json, g_currentUser().SupplierID, g_currentUser().UserID, 0, 'Orders', 'GetOrderItemsByType3', 0, undefined, function(isFinished) {
            	if (isFinished) {
            		setTimeout(function() {

    //           		g_busy(true);
                		pricelistFetchTemplateItems();
            		}, 2000);
            	}
            });
            
        } else {
            
            g_busy(false);
        }
    }
    
    function onRemoteFetchFailure() {
        
        g_busy(false);
        g_alert('ERROR: Cannot retrieve the data.');
    }
}

function pricelistFetchPricelistLive() {
	/*
	if (($('#search').val() == '') && DaoOptions.get('DefaultSearchString')) {
		g_pricelistSearchPricelistText = DaoOptions.getValue('DefaultSearchString');
		$('#search').val(g_pricelistSearchPricelistText);
	}
	*/       
       
       if (g_pricelistIsPrevNextPressed) {
           
           g_pricelistIsPrevNextPressed = false;
           
       } else if (!pricelistIsRangeSelected() && DaoOptions.getValue('MustSearch', 'true') === 'true') {
                   
            if ($('#search').val() === '' && !sessionStorage.getItem('onlinePricelistCategory') && !g_advancedSearchProducts.length) {

                $('#pricelists').hide();
                $('.infoPanelText').text(sessionStorage.getItem('fromAdvanced') == 'true' ? 'No products found.' : 'Enter in search criteria to list products.');
                $('#pricelistInfoDiv ').show();
                $('#NextPrevButtons').hide();
                $.mobile.hidePageLoadingMsg();
                return;
            }
        }
	
	if (g_advancedSearchProducts.length) {
		
            pricelistFetchPricelistLiveOnSuccess(g_advancedSearchProducts);
            return;
	}
        
        var url;
        
        if (pricelistIsRangeSelected()) {
            
            pricelistFetchTemplateItems();   
            return;
            
        } else {
	
            url = DaoOptions.getValue('LivePriceListSearchURL', g_restUrl + 'PriceLists/GetCollection') + '?supplierID=' + g_currentUser().SupplierID + '&accountID=' + g_currentCompany().AccountID.replace('&', '%26') + 
                (g_pricelistSearchPricelistText ? '&searchString=' + g_pricelistSearchPricelistText : '') + '&offset=' + (g_pricelistCurrentPricelistPage - 1) *  g_numItemsPerPage + 
                '&noRows=' + g_numItemsPerPage + '&myRange=false&includeCatalogues=false&branchID=' + g_currentCompany().BranchID;
	
            if (sessionStorage.getItem('onlinePricelistCategory'))
                url += '&category=' + sessionStorage.getItem('onlinePricelistCategory');
        }
	
	console.log(url);
        
        $.mobile.showPageLoadingMsg();
	g_ajaxget(url, pricelistFetchPricelistLiveOnSuccess, pricelistFetchPricelistLiveOnError);
	
}

function pricelistIsCheckWarehouseEnabled() {
    
    return (DaoOptions.getValue('VanandWareOrder', 'false') == 'true') && (sessionStorage.getItem('currentordertype').indexOf('Invoice-') != -1);
}

function pricelistIsRangeSelected() {
    
    var lastRangeType = sessionStorage.getItem('lastRangeType');
    return (lastRangeType && (lastRangeType !== 'None'));
}

function pricelistFetchPricelistJob() {	
        
    $.mobile.showPageLoadingMsg();
    
    //pricelistFetchSearchText();
    $('#pricelists').empty();
    g_pricelistItemsHtml = '';
    g_pricelistItems = [];
    g_pricelistItemsOnPage = 0;
    g_pricelistMultiWarehouses = {};
    
    $('#search').textinput(pricelistIsRangeSelected() && sessionStorage.getItem('lastRangeType') !== 'MyRange' ? 'disable' : 'enable');    
    
    if (pricelistIsRangeSelected() || ((DaoOptions.getValue('MobileOnlinePricelist') === 'true') || g_advancedSearchProducts.length)) { 
    	
        g_pricelistRetryCount = 0;
    	pricelistFetchPricelistLive();
    	
    } else {
    	
    	if (DaoOptions.getValue('MustSearch','true') === 'true') {
            if (g_pricelistSearchPricelistText === '') {
                    $.mobile.hidePageLoadingMsg();
                    return;
            }
    	}
    	
//    	alphaFilter.getInstance().init('#alphafilter');
    	g_pricelistScrollto = false;
    	var offset = (g_pricelistCurrentPricelistPage - 1) * g_numItemsPerPage;
        g_pricelistInvoiceWarehouse = pricelistIsCheckWarehouseEnabled() ? sessionStorage.getItem('currentordertype').replace('Invoice-', '') : '';
        
        var dao = new Dao();                
        dao.fetchPricelist(g_pricelistSearchPricelistText, pricelistOnSuccessRead, undefined, pricelistOnComplete, offset, g_numItemsPerPage, g_pricelistInvoiceWarehouse);                
    }
}

function pricelistFetchPricelistLiveOnSuccess(json) {
    
        g_pricelistRetryCount = 0;
	if (json) {            
            
		$.each(json, function(index, pricelist) {                    
                    
                    if (pricelistIsRangeSelected()) {
                        
			var newPricelist = {};
                        
                        newPricelist.b = pricelist.Barcode;
                        newPricelist.cn = pricelist.CategoryName;
			newPricelist.des = pricelist.Description;
			newPricelist.d = pricelist.Discount;
			newPricelist.g = pricelist.Gross;
			newPricelist.n = pricelist.Nett;
			newPricelist.Stock = pricelist.Stock;
			newPricelist.id = pricelist.ProductID;
			newPricelist.u = parseInt(pricelist.Unit, 10);
			newPricelist.u1 = pricelist.UserField01;
			newPricelist.u2 = pricelist.UserField02;
			newPricelist.u3 = pricelist.UserField03;
			newPricelist.u4 = pricelist.UserField04;
			newPricelist.u5 = pricelist.UserField05;
                        
			pricelistOnSuccessRead(newPricelist);                        
                        
                    } else {
                        
                        pricelist.u = parseInt(pricelist.u, 10);
                        pricelistOnSuccessRead(pricelist);
                    }
                    
		});
	}
	pricelistOnComplete();
	$.mobile.hidePageLoadingMsg();
}

function pricelistFetchPricelistLiveOnError() {	
    if (g_pricelistRetryCount++ < 3 ) {
        setTimeout(function() {
            pricelistFetchPricelistLive();
        }, 2000);
    } else {
        $.mobile.hidePageLoadingMsg();
	g_alert('ERROR: Cannot fetch the pricelist.');
    }
//	$.mobile.hidePageLoadingMsg();
//	g_alert('ERROR: Cannot fetch the pricelist.');
}

function pricelistFetchBarCode(){
	var barcode = $('#search').attr('value');
	$('#search').val('');
    $('#search').focus();
   
    if (!pricelistIsSGScan()) {
    	
    	$('#pricelists').empty();
        $('#barcodescanned').hide();
        g_pricelistItemsHtml = '';
        g_pricelistItems = [];
        g_pricelistMultiWarehouses = {};
    }

    var dao = new Dao();
    dao.fetchPricelist(barcode, pricelistBarcodeOnSuccessRead, pricelistBarcodeOnError, undefined);
    
}

function pricelistBarcodeOnSuccessRead(product) {
	
	var addProduct = function(productObject) {
		
            productdetailSave(quantity, type, productObject);
            pricelistCheckBasket();
		
	    $('#barcodescanned').text(quantity + ' added for ' + productObject.Description);
	    $('#barcodescanned').addClass('greypanel');
	    $('#barcodescanned').removeClass('redpanel');
	    $('#barcodescanned').show();
	    $('#NextPrevButtons').hide();
            $.mobile.hidePageLoadingMsg();
	};
    
//	if (pricelistIsSGScan()) {
//	pricelistOnSuccessRead(product);
//	pricelistOnComplete();
//}
	
	var newProduct = pricelistNewInstance(product);
    
//    var quantity = pricelistIsSGScan() ? 1 : parseInt($('#quantity-w').val(), 10);
    
	g_pricelistIsAnyItemAdded = true;
    
	var dao = new Dao();
	dao.get('BasketInfo',
			(newProduct.ProductID + g_currentUser().SupplierID + g_currentUser().UserID + g_currentCompany().AccountID).trim() + sessionStorage.getItem('currentordertype'),
			function(basketInfo) {		
            
				if (pricelistIsSGScan()) {
					
					g_pricelistSelectedProduct = newProduct;
					productdetailInit();
					
//					quantity = basketInfo.Quantity + 1;					
//					daoPrice.fetchPrice(newProduct, quantity, addProduct);
					
				} else {
					
					addProduct(newProduct);
				}
			},
			function(basketInfo) {	

				if (pricelistIsSGScan()) {
					
					g_pricelistSelectedProduct = newProduct;
					productdetailInit();
					
				} else {
					
					addProduct(newProduct);
				}
			},
			undefined);	
}

/*
 * create new instance
 */
function pricelistNewInstance(product) {
	
	var newProduct = {};
	
        newProduct.Barcode = product.b;
	newProduct.CategoryName = product.cn;
	newProduct.Deleted = product.del;
	newProduct.Description = product.des;
	newProduct.Discount = product.d;
	newProduct.Gross = product.g;
	newProduct.Nett = product.n;
	newProduct.Pricelist = product.pl;
	newProduct.ProductID = product.id;
	newProduct.Unit = parseInt(product.u, 10);
	newProduct.RepNett = 0;
	newProduct.RepDiscount = 0;
	newProduct.Stock = product.Stock;
	
	newProduct.UserField01 = product.u1;
	newProduct.UserField02 = product.u2;
	newProduct.UserField03 = product.u3;
	newProduct.UserField04 = product.u4;
	newProduct.UserField05 = product.u5;
	newProduct.UserField06 = product.u6;
	newProduct.UserField07 = product.u7;
	newProduct.UserField08 = product.u8;
	newProduct.UserField09 = product.u9;
	newProduct.UserField10 = product.u10;
        
        if (DaoOptions.getValue('MobileSelectWhOnPricelist') == 'true') {
            newProduct.Warehouse = $('#whChoiceDiv' + product.id + ' select').val();
        }
	
	return newProduct;
}

function pricelistBarcodeOnError(pricelist) {
	
    $('#barcodescanned').text('BARCODE NOT FOUND');
    $('#barcodescanned').removeClass('greypanel');
    $('#barcodescanned').addClass('redpanel');
    $('#barcodescanned').show();
    
    $('#search').val('');
    $('#search').focus();
    $.mobile.hidePageLoadingMsg();
}

function pricelistOnComplete(event) {
	
    $('#pricelists').toggle(g_pricelistItemsHtml != '');
    
    $('#pricelistInfoDiv').toggle(!g_pricelistItemsHtml && !pricelistIsRangeSelected());
    $('#NextPrevButtons').toggle(!g_pricelistItemsHtml && !pricelistIsRangeSelected());

    if (pricelistIsPricelistVisible()) {

        if (!g_pricelistItemsHtml && !pricelistIsRangeSelected()) {			

            $('#NextPrevButtons').hide();
            var infoText = sessionStorage.getItem('fromCategory') == 'true' || sessionStorage.getItem('fromAdvanced') == 'true' || $.trim($('#search').val()) != '' ?  'No products found.' : 'Enter in search criteria to list products.';			
            $('.infoPanelText').text(infoText);
            $.mobile.hidePageLoadingMsg();
            $('#search').val('');
            $('#search').attr('placeholder', g_companyPageTranslation.translateText('Search for products'));
            $('#search').focus();

            return;
        }

        g_append('#pricelists', g_pricelistItemsHtml);
        $('#pricelists').listview('refresh');
        $('#pricelists input').trigger('create'); //.textinput( "refresh" );
//	    alphaFilter.getInstance().HTML('#alphafilter', '#pricelists');
        pricelistBindCaptureQuantity();

        if ((DaoOptions.getValue('AllowHistoryDownload', 'false') === 'true')) {

            $('#pricelists li').each(function() {

                var that = this;

                pricelistFetchMasterChartBarcode(this.id.replace('li', ''), function(barcode) {

                   var $description = $(that).find('.ui-li-desc');
                   $description.text($description.text() + ' (' + barcode + ' )');                    
                });
            });
        }

    }
	
    g_advancedSearchProducts = [];
    pricelistToCache();
    g_pricelistItemsHtml = '';
    pricelistShowNextPrev();
    pricelistScrollTo('scrollto');
    
    if (g_pricelistItems.length === 1 && g_isUserIntSalse()) {
        pricelistOnItemClicked(0);
    }
}

function pricelistFetchMasterChartBarcode(productId, onSuccess) {
    
    var barcodeFetched = false;
    
    var callback = function(item) {
        
        if (!barcodeFetched) {
         
            onSuccess(item[DaoOptions.getValue('MasterChrtBCodeField')]);
            barcodeFetched = true;
        }        
    };
    
    var dao = new Dao();    
    dao.index('OrderItems', $.trim(g_currentCompany().AccountID) + $.trim(productId), 'index1', callback);
}


function pricelistShowNextPrev() {
	
    g_pricelistItemsHtml = '';  

    if (((DaoOptions.getValue('NoNextAdvSearch') == 'true') && (sessionStorage.getItem('fromAdvanced') == 'true')) || (g_pricelistItemsOnPage < g_numItemsPerPage && g_pricelistCurrentPricelistPage == 1)) {
        $('#NextPrevButtons').hide();
        $('.prev').hide();
        $('.next').hide();
    }
    else if (g_pricelistCurrentPricelistPage == 1) {
        $('#NextPrevButtons').show();
        $('.prev').hide();
        $('.next').show();
    }
    else if (g_pricelistItemsOnPage - g_numItemsPerPage < 0) {
        $('#NextPrevButtons').show();
        $('.prev').show();
        $('.next').hide();
    }
    else {
        $('#NextPrevButtons').show();
        $('.prev').show();
        $('.next').show();
    }
    
    $.mobile.hidePageLoadingMsg();
}

function pricelistFilterPassed(pricelist) {

	var checkFilter = function() {
		
		var passed = true;
		
		$.each(g_advancedSearchFilter, function(field, value) {
			
			if (value && (field.indexOf('UserField') != -1)) {
				
				var index = parseInt(field.substr(field.length - 2), 10);
				
				var userField = 'u' + index;

				var variance = 0;
				
				if (g_currentUser().SupplierID.toUpperCase() == 'SILVERTON') {
					
					if (index < 4)
						variance = parseInt(g_advancedSearchFilter['CoreVariance'], 10);
					else if (index < 7)
						variance = parseInt(g_advancedSearchFilter['TopHPVariance'], 10);
					else
						variance = parseInt(g_advancedSearchFilter['BotHPVariance'], 10);
				}								
				
				value = parseInt(value, 10);				
				pricelist[userField] = parseInt(pricelist[userField], 10);
				
				if (isNaN(pricelist[userField]))
					pricelist[userField] = 0;
				
				if ((pricelist[userField] < value - variance) || (pricelist[userField] > value + variance)) {
					
					passed = false;
					return false;
				}
			}
		});
		
		return passed;
	};
	
	return (DaoOptions.getValue('AllowAdvancedFilter') != 'true') || checkFilter();
}

function pricelistOnSuccessRead(pricelist) {
	
	
	if (!pricelistFilterPassed(pricelist))
		return;	
	
	if (!pricelist.des)
		pricelist.des = 'N/A';
	
	if (!pricelist.cn)
		pricelist.cn = 'N/A';
	
    //currentItem = (g_pricelistCurrentPricelistPage - 1) * g_numItemsPerPage;
    //maxItemOnpage = g_pricelistCurrentPricelistPage * g_numItemsPerPage;
    $('.pageNumber').html(g_pricelistCurrentPricelistPage);
    
    //if (DaoOptions.getValue('MobileOnlinePricelist') ||  (g_pricelistItemsOnPage >= currentItem && g_pricelistItemsOnPage < maxItemOnpage)) {   	
	if (sessionStorage.getItem('currentordertype')=='repl')
            nett = g_addCommas(parseFloat(pricelist.c).toFixed(2));  //for repl, show cost 
	else    	
            nett = g_addCommas(parseFloat(pricelist.n).toFixed(2));  //otherwise show nett 
     g_pricelistItemsHtml += pricelistAddLine(pricelist);
    //}   
    
    g_pricelistItemsOnPage++;
    g_pricelistNumerOfIteminPricelist++;

}

function pricelistBindCaptureQuantity() {
	
	if (DaoOptions.getValue('AllowPriceQuickCapt') == 'true') {

            $('.captureQuantity').off().on('blur', function() {
               
                var itemIndex = Number(this.id.replace('quantity', ''));
                pricelistAddItemToBasket(itemIndex);
                //$(this).siblings('.quantity').text($(this).val());                
            });
            
            $('.captureQuantity').keydown(function (event) {
                return g_isValidQuantityCharPressed(event);
            });
            
            $('.captureQuantity').keypress(function (event) {
                var keycode = (event.keyCode ? event.keyCode : event.which);

                if (keycode === '13') {
                    var itemIndex = Number(this.id.replace('quantity', ''));
                    pricelistAddItemToBasket(itemIndex);
                    //$(this).siblings('.quantity').text($(this).val()); 
                }
            });
	}
        
        if (DaoOptions.getValue('MobileSelectWhOnPricelist') == 'true') {
            $('select').selectmenu();
            $('#pricelists').on('change', 'select', function() {
                //g_alert('changed value to: ' + $(this).val());
                pricelistCheckSelectedMultiWarehouse($(this).data('productid').toString(), $(this).val());
            });
            
        }
        
        if (g_isNoPriceUser()) {
            $('li .price').hide();
        }
}

function pricelistAddLine(pricelist) {
	
    var quantityText = '';
    
    var canOrderItem = true;
    
    //Only use array for indexeddb or online search
    if (g_indexedDB || (DaoOptions.getValue('MobileOnlinePricelist') === 'true') || pricelistIsRangeSelected()) {
        for (var i = 0; i < g_pricelistCurrentBasket.length; i++) {
            if (pricelist.id == g_pricelistCurrentBasket[i].ProductID) {
                quantityText = g_pricelistCurrentBasket[i].Quantity ;
                pricelist.d = g_pricelistCurrentBasket[i].Discount;
                pricelist.n = g_pricelistCurrentBasket[i].Nett;
                if (g_pricelistCurrentBasket[i].Warehouse) {
                    pricelist.Warehouse = g_pricelistCurrentBasket[i].Warehouse;
                }
                break;
            }
        }
    } else {
        
        var basketInfo = pricelist.BasketInfo;
        
        if (!$.isEmptyObject(basketInfo)) {
        
            quantityText = basketInfo.Quantity;
            pricelist.d = basketInfo.Discount;
            pricelist.n = basketInfo.Nett;        
            nett = '' + g_addCommas(parseFloat((basketInfo.RepChangedPrice ? basketInfo.RepNett : pricelist.n)).toFixed(2));
        }        
    	
    	if (productdetailCanChangeNett(pricelist.id))
    		
    	    for (var i = 0; i < g_pricelistCurrentBasket.length; i++) {
    	        if (pricelist.id == g_pricelistCurrentBasket[i].ProductID) {
    	        	
    	        	nett = pricelist.n = pricelist.g = g_pricelistCurrentBasket[i].Nett;
    	        	pricelist.des = g_pricelistCurrentBasket[i].Description;
    	            break;
    	        }
    	    }
    }
    
    var stockValue = (pricelist.Stock !== undefined && pricelist.Stock !== null)? g_stockDescriptions[pricelist.Stock] || pricelist.Stock.toString() : 'N/A';
    var stockText = g_indexedDB || (DaoOptions.getValue('HideStockBubble', 'false') == 'true') ? '' : '<span id="' + pricelist.id + 'Stock" class="ui-li-count">' + stockValue + '</span>';
    if (stockValue==="list-divider") {
        pricelistHtml='<li data-role="list-divider">' + pricelist.des + '</li>';
    }
    else
    {
        if ((pricelist.Stock !== undefined) && isNaN(stockValue)) 
            canOrderItem = false;    		

        var quantityInputHtml = '';
        if (DaoOptions.getValue('AllowPriceQuickCapt') == 'true') {
            
            var step = '';
            if (canOrderItem)    		
                step = 'step=' + (g_isPackSizeUnitValid(pricelist.u) ? pricelist.u : 1) + ' min=0';

            quantityInputHtml = '<input type="' + ((canOrderItem || (!canOrderItem && quantityText && quantityText !== '' && pricelist.Warehouse) ? 'number' : 'text')) + '" style="width:85px;position:relative;top:-10px;display:inline" ' + step + ' onclick="pricelistOnCaptureQuantityClick();" id="quantity' 
                                                    + g_pricelistItems.length + 
                                                    '" class="captureQuantity ui-input-text ui-body-c ui-corner-all ui-shadow-inset"' + ((canOrderItem || (!canOrderItem && quantityText && quantityText !== '' && pricelist.Warehouse))  ? '' : 'disabled') +
                                                    ' value="' + ((canOrderItem || (!canOrderItem && quantityText && quantityText !== '' && pricelist.Warehouse))  ? quantityText : 'Unavailable') + '"/>';
        }
        
        var multiWhHtml = '';
        var messageHtml = '';
        if ((DaoOptions.getValue('MobileSelectWhOnPricelist') === 'true') && (!canOrderItem || pricelist.Stock <= 0)) {
            messageHtml = ' <span style="font-size:13px;color:#8A2416;padding-left:15px;">** ALT BRNCH **</span> ';
            var whsStocksData = pricelist.u6; //'2B;-9999,10;50,50;0'; //this should be data from item's userField or something else
            var whsStocksDataSplited = whsStocksData.split(',');
            multiWhHtml += '<span id="whChoiceDiv' + pricelist.id + '" class="pricelistwhChoiceDiv ui-li-count" onclick="pricelistOnMultiWaregouseClick()">';
            multiWhHtml += '<select data-productID="' + pricelist.id + '" data-mini="true" data-native-menu="true" data-inline="true">';
            
            for (var i = 0; i < whsStocksDataSplited.length; ++i) {
                var whsData = whsStocksDataSplited[i].split(';');
                
                multiWhHtml += '<option value="' + whsData[0] + '" ' + ((pricelist.Warehouse && pricelist.Warehouse === whsData[0]) ? ' selected ' : '' ) +
                    '>' + whsData[0] + ': ' + (whsData[1] !== undefined ? g_stockDescriptions[whsData[1]] || whsData[1] : 'N/A')  +  '</option>';
            }
            
            multiWhHtml += '</select></span>';
            g_pricelistMultiWarehouses[pricelist.id] = whsStocksDataSplited;
            
        }
        
        var productDescriptionWidth = '65';
        
        if (DaoOptions.getValue('AllowPriceQuickCapt') == 'true' || DaoOptions.getValue('MobileSelectWhOnPricelist') === 'true') {
            productDescriptionWidth = '50';
        }
        
        var special = (pricelist.onSpecial ? ' <span style="font-size:13px;color:#8A2416;padding-left:15px;">** On Special **</span> ' : '');
        
        var showThumbnail = (DaoOptions.getValue('MobileThumbnails') == 'true') && (!localStorage.getItem('usageMode') || localStorage.getItem('usageMode') === 'Online') &&
            (!localStorage.getItem('thumbnailMode') || localStorage.getItem('thumbnailMode') === 'On_Thumbs');
    
        var descriptionComment = false;
        if (DaoOptions.getValue('PricelistAddFieldDesc') && pricelist[DaoOptions.getValue('PricelistAddFieldDesc')]) {
            descriptionComment = true;
        }

        //TODO below input box needs to only be for Midas. ie. which we have an option variable
        var pricelistHtml =       
            '<li id="li' + g_pricelistItems.length + '" style="position:relative" ' + pricelistScrollToPos(pricelist) + ' ' + alphaFilter.getInstance().addClass(pricelist.des) + '>' +
            '<a href onclick="pricelistOnItemClicked(\'' + g_pricelistItems.length + '\');">' +   
            (/*DaoOptions.getValue('MobileThumbnails') == 'true'*/ showThumbnail ? '<td rowspan="2" class="quantity" align="right"><img src="' + productdetailGetImageUrl(pricelist.id, 80) + '" /></td>' : '') +
            '<span style="font-size:11px;">' + pricelist.id + '</span>' + special + messageHtml +'<br/>' +
            '<span class="ui-li-desc" style="font-size:16px; padding-top:10px; display:inline-block; width:' + productDescriptionWidth + '%;">' + pricelist.des + (descriptionComment ? ' (' + pricelist[DaoOptions.getValue('PricelistAddFieldDesc')] + ')' : '') + '</span>' +
            quantityInputHtml +        
            '<span id="' + g_pricelistItems.length + '" class="quantity" style="color:red;width:5%; position:relative; top:-10px; left:-15px; display:inline-block;text-align:right">' + quantityText + '</span>' +
            '<span class="price" style="width:10%; position:relative; top:-10px; display:inline-block;text-align:right">' + nett + '</span>' +
            (multiWhHtml !== '' ? multiWhHtml : stockText) +
            '</a>';

        if (pricelistIsQuickCaptureEnabled())
            pricelistHtml += 
            '<a href="#" onclick="pricelistAddItemToBasket(\'' + g_pricelistItems.length + '\')" class="ui-li-link-alt ui-btn ui-btn-up-c" data-theme="c" >' +
            '<span class="ui-btn-inner ui-btn-corner-all">' +
            '<span class="ui-icon ui-icon-delete ui-icon-shadow">Add</span>' +
            '</span>' +
            '</a>';

        pricelistHtml += '</li>'; 
        g_pricelistItems.push(pricelist);
        categories.getInstance().addCategory(pricelist.cn);
    }
    
    return pricelistHtml;
}

// Check if we in category search, then scroll to product
function pricelistScrollToPos(pricelist){
    try {
	if (!sessionStorage.getItem('expandcategory')) return;
        //if (g_pricelistScrollto) return '';
	var txt = sessionStorage.getItem("pricelistsearchtxt");
	if (pricelist.des.toLowerCase().indexOf(txt.toLowerCase()) >= 0 || pricelist.id.toLowerCase().indexOf(txt.toLowerCase()) >= 0) {
            g_pricelistScrollto = true;
            return ' class="scrollto" ';
	}
	return '';		
    } catch (err){
	contole.log(err.message);
    }

}

function pricelistOnMultiWaregouseClick() {
	g_pricelistMultiWarehouseClicked = true;
}

function pricelistOnCaptureQuantityClick() {
	g_pricelistCaptureQuantityClicked = true;
}

function pricelistToCache() {
	
    var sessionState = { "Page": g_pricelistCurrentPricelistPage, 
    					"SearchText": g_pricelistSearchPricelistText, 
    					"Pricelist": g_currentCompany().Pricelist, 
    					"SupplierID": g_currentCompany().SupplierID, 
    					"AccountID": g_currentCompany().AccountID, 
    					"ItemsHtml": g_pricelistItemsHtml,
    					"Items": g_pricelistItems
    					};
    
    sessionStorage.setItem('cachePricelist', JSON.stringify(sessionState));
}

// Checks if current item g_pricelistView matches cached ones. Returns true if state is restored from session otherwise returns false
function pricelistFromCache(pricelist, supplierID, accountID) {
	
	$('#NextPrevButtons').hide();
	$('#productDetailPanel').hide();
	$('#productInfoPanel').hide();
	$('#componentsPanel').hide();
	$('#technicalInfoPanel').hide();
	$('#largeImagePanel').hide();
	
	$('.hidden').removeClass('hidden');
	
	var sessionState = null;
	if (sessionStorage.getItem('cachePricelist') != null) 
		sessionState = JSON.parse(sessionStorage.getItem('cachePricelist'));
	
	pricelistCheckBasket();
    
	if (sessionState && sessionState != null && sessionState.Pricelist == pricelist && sessionState.SupplierID == supplierID && sessionState.AccountID == accountID) {
		
        g_pricelistSearchPricelistText = sessionState.SearchText;
        g_pricelistCurrentPricelistPage = sessionState.Page;

        g_pricelistItemsHtml = '';
        if (g_vanSales && g_currentCompany().AccountID.toUpperCase() == g_currentUser().RepID.toUpperCase()) {
        	
            $('#historyTab').hide();
            $('#companyTab').hide();
            $('#activityTab').hide();

            if (sessionStorage.getItem("currentordertype") == "repl")
                $('#pagelabel').text('Replenish');
            else if (sessionStorage.getItem("currentordertype") == "stock")
                $('#pagelabel').text('Stocktake');
        }
        
        pricelistShowNextPrev();
        $('#search').attr('value', sessionState.SearchText);
        $('.pageNumber').html(sessionState.Page);
        $('#pricelists').empty();
        
        if (pricelistIsPricelistVisible()) { 

	        g_append('#pricelists', sessionState.ItemsHtml);
	        $('#pricelists').listview('refresh');
	        pricelistBindCaptureQuantity();
        }
        
        g_pricelistItems = sessionState.Items;
       
        return true;
    }
	
    return false;    
}


function pricelistIsPricelistVisible() {
	
	return (pricelistIsSGScan() || ('search' == $('#barcodetoggle').val()));
}

function pricelistOnItemClicked(itemIndex) {
	
    if (g_pricelistCaptureQuantityClicked) {

            g_pricelistCaptureQuantityClicked = false;
            return;
    }
    
    if (g_pricelistMultiWarehouseClicked) {
        g_pricelistMultiWarehouseClicked = false;
        return;
    }     
	
    if (itemIndex >= 0 && itemIndex < g_pricelistItems.length) {
        if (itemIndex > 0) {
            if ($('#prevProductButton').hasClass('ui-disabled'))
                $('#prevProductButton').removeClass('ui-disabled');
        } else {
            if (!$('#prevProductButton').hasClass('ui-disabled'))
                $('#prevProductButton').addClass('ui-disabled');
        }

        if ((itemIndex == g_pricelistItems.length - 1)) {
            if (!($('#nextProductButton').hasClass('ui-disabled')))
                $('#nextProductButton').addClass('ui-disabled');
        } else {
            if (($('#nextProductButton').hasClass('ui-disabled')))
                $('#nextProductButton').removeClass('ui-disabled');
        }
        
        pricelistStoreItemData(itemIndex);
        
        g_lastScrollPosition = $(window).scrollTop();
        g_companyPageTranslation.translateButton('#backbtn', 'Back');
        productdetailInit();
    }
}

function pricelistAddItemToBasket(itemIndex) {
    
    if ((Number(g_pricelistItems[itemIndex].n) === 0) && (DaoOptions.getValue('CanOrderZeroPrice') !== 'true'))
        return;
	
    var getQuantity = function(itemIndex) {

        return DaoOptions.getValue('AllowPriceQuickCapt') == 'true' ? Number($('#quantity' + itemIndex).val()) : pricelistGetNewQuantityForItem(itemIndex);
    };

    var deleteItemOnSuccess = function() {

        $('#' + itemIndex).html('');
    };

    if (!getQuantity(itemIndex)) {

        shoppingCartDeleteItem(g_pricelistItems[itemIndex].id + g_currentUser().SupplierID + g_currentUser().UserID + g_currentCompany().AccountID + sessionStorage.getItem('currentordertype'), 
                        DaoOptions.getValue('LostSaleActivityID') != undefined, 
                        undefined, 
                        deleteItemOnSuccess, false);

        return;
    }	
    
    var unit = parseInt(g_pricelistItems[itemIndex].u, 10);

    //TODO below should default to '1' or use #quantity with the correct optioninfo for MIDAS

    if (g_isQuantityValid(getQuantity(itemIndex), unit)) {
        if ($('#grossvalue').html())
            g_pricelistItems[itemIndex].g = $('#grossvalue').html();
        
        basket.saveItem(pricelistNewInstance(g_pricelistItems[itemIndex]), getQuantity(itemIndex), function() {
            

            //clear search after adding to basket so its easy to re-search
            $('#search').val(''); 

            g_clearCacheDependantOnBasket(false);
            pricelistCheckBasket();
            //TODO also change here
            $('#' + itemIndex).html(getQuantity(itemIndex));            
        });    
    }
}

function pricelistGetNewQuantityForItem(itemIndex) {
	
	var currentValue = parseInt($('#' + itemIndex).html(), 10);
	
	if (!currentValue)
		currentValue = 0;
	
	return newValue = currentValue + parseInt($('#pricelistQuantity').val(), 10);
}

function pricelistStoreItemData(itemIndex) {

    g_pricelistSelectedProduct = {};
    
    g_pricelistSelectedProduct.Barcode = g_pricelistItems[itemIndex].b;
    g_pricelistSelectedProduct.Cost = g_pricelistItems[itemIndex].c;
    g_pricelistSelectedProduct.CategoryName = g_pricelistItems[itemIndex].cn;
    g_pricelistSelectedProduct.Deleted = g_pricelistItems[itemIndex].del;
    g_pricelistSelectedProduct.Description = g_pricelistItems[itemIndex].des;
    g_pricelistSelectedProduct.Discount = g_pricelistItems[itemIndex].d;
    g_pricelistSelectedProduct.Gross = g_pricelistItems[itemIndex].g;
    g_pricelistSelectedProduct.Nett = g_pricelistItems[itemIndex].n;
    g_pricelistSelectedProduct.Pricelist = g_pricelistItems[itemIndex].pl;
    g_pricelistSelectedProduct.ProductID = g_pricelistItems[itemIndex].id;
    g_pricelistSelectedProduct.Unit = parseInt(g_pricelistItems[itemIndex].u, 10);
    g_pricelistSelectedProduct.RepNett = g_pricelistItems[itemIndex].RepNett;
    g_pricelistSelectedProduct.RepDiscount = g_pricelistItems[itemIndex].RepDiscount;
    g_pricelistSelectedProduct.VAT = g_pricelistItems[itemIndex].v;
    		
    g_pricelistSelectedProduct.Similar = g_pricelistItems[itemIndex].sim;
    g_pricelistSelectedProduct.UserField01 = g_pricelistItems[itemIndex].u1;
    g_pricelistSelectedProduct.UserField02 = g_pricelistItems[itemIndex].u2;
    g_pricelistSelectedProduct.UserField03 = g_pricelistItems[itemIndex].u3;
    g_pricelistSelectedProduct.UserField04 = g_pricelistItems[itemIndex].u4;
    g_pricelistSelectedProduct.UserField05 = g_pricelistItems[itemIndex].u5;
    g_pricelistSelectedProduct.UserField06 = g_pricelistItems[itemIndex].u6;
    g_pricelistSelectedProduct.UserField07 = g_pricelistItems[itemIndex].u7;
    g_pricelistSelectedProduct.UserField08 = g_pricelistItems[itemIndex].u8;
    g_pricelistSelectedProduct.UserField09 = g_pricelistItems[itemIndex].u9;
    g_pricelistSelectedProduct.UserField10 = g_pricelistItems[itemIndex].u10;

    g_pricelistSelectedProduct.Stock = g_pricelistItems[itemIndex].Stock;
    g_pricelistSelectedProduct.Basket = g_pricelistItems[itemIndex].Basket;
    
    if (!$.isEmptyObject(g_pricelistItems[itemIndex].BasketInfo)) {
        g_pricelistSelectedProduct.Type = g_pricelistItems[itemIndex].BasketInfo.Type;
    }
    
    g_pricelistSelectedProduct.ItemIndex = itemIndex;
}

function pricelistCheckSelectedMultiWarehouse(productID, warehouse) {
    var multivasehouses = g_pricelistMultiWarehouses[productID];
    var whStock = -9999;
    for (var i = 0; i < multivasehouses.length; ++i) {
        var whData = multivasehouses[i].split(';');
        if (whData[0] === warehouse) {
            whStock = parseInt(whData[1], 10);
            break;
        }
    }
    var stockValue = whStock !== undefined ? g_stockDescriptions[whStock] || whStock.toString() : 'N/A';
    //g_alert('Stock for warehouse "' + warehouse + '" is ' + stockValue);
    
    //$('#' + productID + 'Stock').html(stockValue);
    
    var canOrderItem = true;
    if ((whStock !== undefined) && isNaN(stockValue)) {
        canOrderItem = false;
    }
    
    var quantityInputHtml = '';
    if (DaoOptions.getValue('AllowPriceQuickCapt') == 'true') {
        var inputElement = ($('#whChoiceDiv' + productID).parent().parent()).find('input');
        var index = parseInt(inputElement.attr('id').replace('quantity', ''), 10);
        var tmpProduct = g_pricelistItems[index];
        var step = '';
        if (canOrderItem)    		
            step = 'step=' + (g_isPackSizeUnitValid(tmpProduct.u) ? tmpProduct.u : 1) + ' min=0';

        quantityInputHtml = '<input type="' + (canOrderItem ? 'number' : 'text') + '" style="width:85px;position:relative;top:-10px;display:inline" ' + step + ' onclick="pricelistOnCaptureQuantityClick();" id="quantity' 
                            + index + 
                            '" class="captureQuantity ui-input-text ui-body-c ui-corner-all ui-shadow-inset"' + (canOrderItem ? '' : 'disabled') + ' value="' + (canOrderItem ? '' : 'Unavailable') + '"/>';
        inputElement.replaceWith(quantityInputHtml);
        
        if (canOrderItem) {
            //$('#pricelists').listview('refresh');
            $('.captureQuantity').off().on('blur', function() {
               
                var itemIndex = Number(this.id.replace('quantity', ''));
                pricelistAddItemToBasket(itemIndex);
                $(this).siblings('.quantity').text($(this).val());                
            });
            
            $('.captureQuantity').keypress(function (event) {
                var keycode = (event.keyCode ? event.keyCode : event.which);

                if (keycode == '13') {
                    var itemIndex = Number(this.id.replace('quantity', ''));
                    pricelistAddItemToBasket(itemIndex);
                    $(this).siblings('.quantity').text($(this).val()); 
                }
            });
            
//            $('#pricelists').on('blur', 'input', function() {
//                if (this.id === inputElement.attr('id')) {
//                    var itemIndex = Number(this.id.replace('quantity', ''));
//                    pricelistAddItemToBasket(itemIndex);
//                    $(this).siblings('.quantity').text($(this).val());
//                }
//            });

               
        } else {
            pricelistStoreItemData(index);
            var deleteItemOnSuccess = function() {

                if (productdetailCanChangeNett(g_pricelistSelectedProduct.ProductID)) {

                    pricelistShowExpandCategory(true);
                    pricelistBasicSearch();

                } else {

                    $('#' + g_pricelistSelectedProduct.ItemIndex).text('');
                }

            };

            shoppingCartDeleteItem(g_pricelistSelectedProduct.ProductID + g_currentUser().SupplierID + g_currentUser().UserID + g_currentCompany().AccountID + sessionStorage.getItem('currentordertype'), 
                                    DaoOptions.getValue('LostSaleActivityID') != undefined, 
                                    undefined, 
                                    deleteItemOnSuccess, '', pricelistOnBackButtonClick);
        }
    }
    
}

function pricelistDoExtraCoplexSearch() {
    var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_pricelist_ListPromo&params=(%27' + g_currentUser().SupplierID + '%27)';
    $.mobile.showPageLoadingMsg();
    var onSuccess = function(json) {
        console.log(JSON.stringify(json));
        if (!json.length) {
            $.mobile.hidePageLoadingMsg();
            return;
        }
        
        var itemsHTML = '';
        
        for (var i=0; i < json.length; ++i) {
            itemsHTML += (json[i] && json[i].Promotion) ? ('<li id="' + json[i].Promotion + '"><a href >' + json[i].Promotion + '</a></li>') : '';
        }
        
        $('#extrasearchComplexList ul').html(itemsHTML);
        
        $('#extrasearchComplexPopup').popup('open');
        $('#extrasearchComplexList ul').listview('refresh');
        $.mobile.hidePageLoadingMsg();
        
        $('#extrasearchComplexList').off().on('click', 'li', function () {
           console.log('Promotion: ' + this.id);
           pricelistFetshExtrasearchItems(this.id);
           $('#extrasearchComplexPopup').popup('close');
        });
    };
    
    var onError = function(json) {
        $.mobile.hidePageLoadingMsg();
        console.log(JSON.stringify(json));
    };
    
    g_ajaxget(url, onSuccess, onError);
}

function pricelistFetshExtrasearchItems(promoID) {
    $.mobile.showPageLoadingMsg();
    var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_pricelist_GetPromoCollection&params=(%27' + g_currentUser().SupplierID + '%27|%27' + promoID + '%27|%27'+ g_currentCompany().AccountID + '%27)';
    
    var onSuccess = function(json) {
        console.log(JSON.stringify(json));
        if (!json.length) {
            $.mobile.hidePageLoadingMsg();
            return;
        }
        
        $.each(g_pricelistCurrentBasket, function(itemIndex, basketinfo) {
            for (var i = 0; i < json.length; ++i) {
                if (basketinfo.ProductID === json[i].id) {
                    json[i].BasketInfo = basketinfo;
                    break;
                }
            }
        });
        
        g_pricelistItemsOnPage = 0;
        g_pricelistCurrentPricelistPage = 1;
        $('#pricelists').empty();
        g_pricelistItemsHtml = '';
        g_pricelistItems = [];
        g_pricelistMultiWarehouses = {};
        
        
        pricelistFetchPricelistLiveOnSuccess(json);
        
        
    };
    
    var onError = function(json) {
        $.mobile.hidePageLoadingMsg();
        console.log(JSON.stringify(json));
    };
    
    //if (!g_indexedDB && (DaoOptions.getValue('MobileOnlinePricelist') !== 'true') && (DaoOptions.getValue('CanDoNonStock') !== 'true')) {
            //pricelistFetchPricelistJob();
    //        return;
    //} else {		    
        var dao = new Dao();
        var i = 0;
        g_pricelistCurrentBasket = [];

        dao.cursor('BasketInfo', undefined, undefined,
        function (basketinfo) {
            if ((basketinfo.AccountID == g_currentCompany().AccountID) /*&& (basketinfo.Type == sessionStorage.getItem("currentordertype"))*/) {
                g_pricelistCurrentBasket[i++] = basketinfo;
            }
        }, undefined,
        function (event)  {
            g_ajaxget(url, onSuccess, onError);
        }
        );
    //}
    
//    g_ajaxget(url, onSuccess, onError);
}