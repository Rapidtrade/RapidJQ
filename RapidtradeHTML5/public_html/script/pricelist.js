var g_pricelistSelectedProduct = {ItemIndex: -1};
var g_pricelistView = 'pricelist';
var g_pricelistItems = [];

var g_pricelistMobileLiveStockDiscount = false;
var g_pricelistCanChangeDiscount = false;
var g_productDetailInitialized = false;
var g_pricelistVolumePrices = [];
var g_pricelistIsAnyItemAdded = false;
var g_lastScrollPosition = 0;
var g_pricelistSearchPricelistText = '';
var g_numItemsPerPage = 100;
var g_pricelistScrollto = false;

var g_pricelistCaptureQuantityClicked = false;
var g_pricelistInvoiceWarehouse = '';

/**
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */

function pricelistOnPageShow() {
    
    if (DaoOptions.getValue('VanandWareOrder', 'false') === 'true')
        sessionStorage.removeItem('cachePricelist');
    
    $('#search').val(pricelistIsCheckWarehouseEnabled() ? '' : g_pricelistSearchPricelistText);
	        
    pricelistHideFooter();
    overlaySetMenuItems();

    pricelistOnPageShowSmall();	
    g_showCurrentCompanyName();
	
    var isAdvancedSearchAllowed = (DaoOptions.getValue('AllowAdvancedSearch') == 'true');
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
	} else {
	    g_pricelistCanChangeDiscount = (DaoOptions.getValue('CanChangeDiscount')) && (DaoOptions.getValue('CanChangeDiscount').toLowerCase() == 'true');
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

function pricelistOnBackButtonClick() {
	
    $('.productimage').hide();
    
    if (sessionStorage.getItem("currentordertype")=="repl" && g_vanSales && g_pricelistView == 'pricelist') {  
    	
        g_loadMenu();
        
    } else if (sessionStorage.getItem("currentordertype") == "stock") {
    	
        g_loadMenu();
        
    } else if (g_pricelistView == 'detail') {
    	
    	if (sessionStorage.getItem('fromCategory') == 'true')
            $('#backbtn .ui-btn-text').text('Categories');
    	else if (sessionStorage.getItem('fromAdvanced') == 'true')
            $('#backbtn .ui-btn-text').text('Advanced Search');
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
        
    } else if (sessionStorage.getItem('fromCategory') == 'true') {
    	
    	pricelistDoSearch('categories');
        $('#backbtn .ui-btn-text').text('Back');
    	$('#backbtn').hide();
    	
    } else if (sessionStorage.getItem('fromAdvanced') == 'true') {
    	
    	pricelistDoSearch('advanced');
        $('#backbtn .ui-btn-text').text('Back');
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
}

function pricelistInit() {
	
	//Initialise variables
    g_pricelistCurrentPricelistPage = 1;
    g_pricelistNumerOfIteminPricelist = 0;
    g_pricelistItemsHtml = '';
    g_pricelistItemsOnPage = 0;
    
    //Initialise forms
    
    if (sessionStorage.getItem('fromCategory') == 'true') {
        $('#backbtn .ui-btn-text').text('Categories');
    	$('#backbtn').show();
    	pricelistShowExpandCategory(false);
    }
    
    
    if (sessionStorage.getItem('fromAdvanced') == 'true') {
        $('#backbtn .ui-btn-text').text('Advanced Search');
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
	$('#search').attr('placeholder', 'Search for products');
	
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
	
	var isLiveAdvancedSearch = (searchType == 'advanced') && (DaoOptions.getValue('LiveAdvanceSearch') != '');
	
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
	g_pricelistSearchPricelistText = '"' + category + '"';
	pricelistFetchPricelist(); 
    if (sessionStorage.getItem('fromCategory') == 'true') {
        $('#backbtn .ui-btn-text').text('Categories');
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
        $('.ui-btn-right').removeClass('ui-disabled');
        $('.ui-btn-right .ui-btn-text').text('(' + cnt + ')' + ' Shopping Cart');
        isBaksetEmpty = false;
        g_pricelistIsAnyItemAdded = true;
        
        if (setOverlay)
            overlaySetMenuItems();
    }, function() {
        g_pricelistIsAnyItemAdded = false;
        $('.ui-btn-right').addClass('ui-disabled');
        $('.ui-btn-right .ui-btn-text').text('Shopping Cart');
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

    if (!g_indexedDB && (DaoOptions.getValue('MobileOnlinePricelist') != 'true') && (DaoOptions.getValue('CanDoNonStock') != 'true')) {
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

function pricelistFetchPricelistLive() {
	/*
	if (($('#search').val() == '') && DaoOptions.get('DefaultSearchString')) {
		g_pricelistSearchPricelistText = DaoOptions.getValue('DefaultSearchString');
		$('#search').val(g_pricelistSearchPricelistText);
	}
	*/
	if (DaoOptions.getValue('MustSearch', 'true') == 'true'){
            
		if ($('#search').val() == '' && !sessionStorage.getItem('onlinePricelistCategory') && $.isEmptyObject(g_advancedSearchProducts)) {
			
			$('#pricelists').hide();
			$('.infoPanelText').text(sessionStorage.getItem('fromAdvanced') == 'true' ? 'No products found.' : 'Enter in search criteria to list products.');
			$('#pricelistInfoDiv ').show();
			$('#NextPrevButtons').hide();
			$.mobile.hidePageLoadingMsg();
			return;
		}
	}
	
	if (!$.isEmptyObject(g_advancedSearchProducts)) {
		
		pricelistFetchPricelistLiveOnSuccess(g_advancedSearchProducts);
		return;
	}
	
	$.mobile.showPageLoadingMsg();
	var url = DaoOptions.getValue('LivePriceListSearchURL', g_restUrl + 'PriceLists/GetCollection') + '?supplierID=' + g_currentUser().SupplierID + '&accountID=' + g_currentCompany().AccountID + 
	(g_pricelistSearchPricelistText ? '&searchString=' + g_pricelistSearchPricelistText : '') + '&offset=' + (g_pricelistCurrentPricelistPage - 1) *  g_numItemsPerPage + 
	'&noRows=' + g_numItemsPerPage + '&myRange=false&includeCatalogues=false&branchID=' + g_currentCompany().BranchID;
	
	if (sessionStorage.getItem('onlinePricelistCategory'))
		url += '&category=' + sessionStorage.getItem('onlinePricelistCategory');
	
	console.log(url);
	g_ajaxget(url, pricelistFetchPricelistLiveOnSuccess, pricelistFetchPricelistLiveOnError);
	
}

function pricelistIsCheckWarehouseEnabled() {
    
    return (DaoOptions.getValue('VanandWareOrder', 'false') == 'true') && (sessionStorage.getItem('currentordertype').indexOf('Invoice-') != -1);
}

function pricelistFetchPricelistJob() {	
        
    $.mobile.showPageLoadingMsg();
    
    //pricelistFetchSearchText();
    $('#pricelists').empty();
    g_pricelistItemsHtml = '';
    g_pricelistItems = [];
    
    if ((DaoOptions.getValue('MobileOnlinePricelist') == 'true') || (!$.isEmptyObject(g_advancedSearchProducts))) { 
    	
    	pricelistFetchPricelistLive();
    	
    } else {
    	
    	if (DaoOptions.getValue('MustSearch','true') == 'true'){
            if (g_pricelistSearchPricelistText == '') {
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
	if (json) {
		$.each(json, function(index, pricelist) {
			var newPricelist = {};
			newPricelist.b = pricelist.b;
			newPricelist.cn = pricelist.cn;
			newPricelist.del = pricelist.del;
			newPricelist.des = pricelist.des;
			newPricelist.d = pricelist.d;
			newPricelist.g = pricelist.g;
			newPricelist.n = pricelist.n;
			newPricelist.pl = pricelist.pl;
			newPricelist.Stock = pricelist.Stock;
			newPricelist.onSpecial = pricelist.onSpecial;
			newPricelist.id = pricelist.id;
			newPricelist.u = parseInt(pricelist.u, 10);
			newPricelist.u1 = pricelist.u1;
			newPricelist.u2 = pricelist.u2;
			newPricelist.u3 = pricelist.u3;
			newPricelist.u4 = pricelist.u4;
			newPricelist.u5 = pricelist.u5;
			newPricelist.u6 = pricelist.u6;
			newPricelist.u7 = pricelist.u7;
			newPricelist.u8 = pricelist.u8;
			newPricelist.u9 = pricelist.u9;
			newPricelist.u10 = pricelist.u10;
			pricelistOnSuccessRead(newPricelist);
		});
	}
	pricelistOnComplete();
	$.mobile.hidePageLoadingMsg();
}

function pricelistFetchPricelistLiveOnError() {	
	$.mobile.hidePageLoadingMsg();
	g_alert('ERROR: Cannot fetch the pricelist.');
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
			(newProduct.ProductID + g_currentUser().SupplierID + g_currentUser().UserID + g_currentCompany().AccountID).trim(),
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
	
	var newProduct = [];
	
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

	
	return newProduct;
}

function pricelistBarcodeOnError(pricelist) {
	
    $('#barcodescanned').text('BARCODE NOT FOUND');
    $('#barcodescanned').removeClass('greypanel');
    $('#barcodescanned').addClass('redpanel');
    $('#barcodescanned').show();
	$.mobile.hidePageLoadingMsg();
	$('#search').val('');
    $('#search').focus();
	$.mobile.hidePageLoadingMsg();
}

function pricelistOnComplete(event) {
	
	$('#pricelists').toggle(g_pricelistItemsHtml != '');
	$('#pricelistInfoDiv').toggle(g_pricelistItemsHtml == '');
	$('#NextPrevButtons').toggle(g_pricelistItemsHtml != '');
	
	if (pricelistIsPricelistVisible()) {
		
		if (!g_pricelistItemsHtml) {			
			
			var infoText = sessionStorage.getItem('fromCategory') == 'true' || sessionStorage.getItem('fromAdvanced') == 'true' || $.trim($('#search').val()) != '' ?  'No products found.' : 'Enter in search criteria to list products.';			
			$('.infoPanelText').text(infoText);
			$.mobile.hidePageLoadingMsg();
			
			return;
		}
		
	    g_append('#pricelists', g_pricelistItemsHtml);
	    $('#pricelists').listview('refresh');
	    $('#pricelists input').trigger('create'); //.textinput( "refresh" );
//	    alphaFilter.getInstance().HTML('#alphafilter', '#pricelists');
	    pricelistBindCaptureQuantity();
	}
	
    g_advancedSearchProducts = [];
    pricelistToCache();
    g_pricelistItemsHtml = '';
    pricelistShowNextPrev();
    pricelistScrollTo('scrollto');
    
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
	
		$('.captureQuantity').off('keypress');
		$('.captureQuantity').on('keypress', function(event) {
			
	 	    var keycode = (event.keyCode ? event.keyCode : event.which);
	 	    
	 	    if (keycode == '13') {
	 	    	
	 	    	var itemIndex = Number(this.id.replace('quantity', ''));
	 	    	pricelistAddItemToBasket(itemIndex);
	 	    }
		});
	}
}

function pricelistAddLine(pricelist) {
	
    var quantityText = '';
    
    var canOrderItem = true;
    
    //Only use array for indexeddb or online search
    if (g_indexedDB || (DaoOptions.getValue('MobileOnlinePricelist') == 'true')) {
        for (var i = 0; i < g_pricelistCurrentBasket.length; i++) {
            if (pricelist.id == g_pricelistCurrentBasket[i].ProductID) {
                quantityText = g_pricelistCurrentBasket[i].Quantity ;
                pricelist.d = g_pricelistCurrentBasket[i].Discount;
                pricelist.n = g_pricelistCurrentBasket[i].Nett;
                break;
            }
        }
    } else {
    	quantityText = pricelist.BasketQty || '';    	
    	
    	if (productdetailCanChangeNett(pricelist.id))
    		
    	    for (var i = 0; i < g_pricelistCurrentBasket.length; i++) {
    	        if (pricelist.id == g_pricelistCurrentBasket[i].ProductID) {
    	        	
    	        	nett = pricelist.n = pricelist.g = g_pricelistCurrentBasket[i].Nett;
    	        	pricelist.des = g_pricelistCurrentBasket[i].Description;
    	            break;
    	        }
    	    }
    }
    
    var stockValue = pricelist.Stock !== undefined ? g_stockDescriptions[pricelist.Stock] || pricelist.Stock.toString() : 'N/A';
    var stockText = DaoOptions.getValue('HideStockBubble', 'false') == 'true' ? '' : '<span id="' + pricelist.id + 'Stock" class="ui-li-count">' + stockValue + '</span>';
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

            quantityInputHtml = '<input type="' + (canOrderItem ? 'number' : 'text') + '" style="width:85px;position:relative;top:-10px;display:inline" ' + step + ' onclick="pricelistOnCaptureQuantityClick();" id="quantity' 
                                                    + g_pricelistItems.length + 
                                                    '" class="captureQuantity ui-input-text ui-body-c ui-corner-all ui-shadow-inset"' + (canOrderItem ? '' : 'disabled') + ' value="' + (canOrderItem ? '' : 'Unavailable') + '"/>';
        }

        var special = (pricelist.onSpecial ? ' <span style="font-size:13px;color:#8A2416;padding-left:15px;">** On Special **</span> ' : '');

        //TODO below input box needs to only be for Midas. ie. which we have an option variable
        var pricelistHtml =       
            '<li id="li' + pricelist.id + '" style="position:relative" ' + pricelistScrollToPos(pricelist) + ' ' + alphaFilter.getInstance().addClass(pricelist.des) + '>' +
            '<a href="#" onclick="pricelistOnItemClicked(\'' + g_pricelistItems.length + '\');">' +   
            (DaoOptions.getValue('MobileThumbnails') == 'true' ? '<td rowspan="2" class="quantity" align="right"><img src="' + productdetailGetImageUrl(pricelist.id, 80) + '"></td>' : '') +
            '<span style="font-size:11px;">' + pricelist.id + '</span>' + special + '<br/>' +
            '<span class="ui-li-desc" style="font-size:16px; padding-top:10px; display:inline-block; width:70%">' + pricelist.des + '</span>' +
            quantityInputHtml +        
            '<span id="' + pricelist.id + '" class="quantity" style="color:red;width:5%; position:relative; top:-10px; left:-15px; display:inline-block;text-align:right">' + quantityText + '</span>' +
            '<span class="price" style="width:10%; position:relative; top:-10px; display:inline-block;text-align:right">' + nett + '</span>' +
            stockText +
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
        $('#backbtn .ui-btn-text').text('Back');
        productdetailInit();
    }
}

function pricelistAddItemToBasket(itemIndex) {
	
	var getQuantity = function(itemIndex) {
		
            return DaoOptions.getValue('AllowPriceQuickCapt') == 'true' ? $('#quantity' + itemIndex).val() : pricelistGetNewQuantityForItem(itemIndex);
	};
	
	var deleteItemOnSuccess = function() {
		
            $('#' + g_pricelistItems[itemIndex].id).html('');
	};
	
	if (!getQuantity(itemIndex)) {

            shoppingCartDeleteItem(g_pricelistItems[itemIndex].id + g_currentUser().SupplierID + g_currentUser().UserID + g_currentCompany().AccountID, 
                            DaoOptions.getValue('LostSaleActivityID') != undefined, 
                            undefined, 
                            deleteItemOnSuccess, false);

            return;
	}	
	
	var unit = parseInt(g_pricelistItems[itemIndex].u, 10);
	
	//TODO below should default to '1' or use #quantity with the correct optioninfo for MIDAS

	if (g_isQuantityValid(getQuantity(itemIndex), unit)) {
	
		g_addProductToBasket(
                    g_pricelistItems[itemIndex].id,
	            g_currentCompany().SupplierID,
	            g_currentCompany().AccountID,
	            getQuantity(itemIndex),
	            g_currentUser().UserID,
	            g_pricelistItems[itemIndex].n,
	            g_pricelistItems[itemIndex].des,
	            g_pricelistItems[itemIndex].d,
	            $('#grossvalue').html(),
	            sessionStorage.getItem("currentordertype"),
	            '',
	            '',
	            '',
	            g_isPackSizeUnitValid(unit) ? unit : '',
	           '',
	           '',
	           g_pricelistItems[itemIndex].v
	    );
            //clear search after adding to basket so its easy to re-search
            //commented out because this caused the issue with Next button (https://rapidtrade.basecamphq.com/projects/11434985-midas/todo_items/184747466/comments)
//            $('#search').val(''); 
		
	    g_clearCacheDependantOnBasket(false);
	    pricelistCheckBasket();
	    //TODO also change here
	    $('#' + g_pricelistItems[itemIndex].id).html(getQuantity(itemIndex));
	}
}

function pricelistGetNewQuantityForItem(itemIndex) {
	
	var currentValue = parseInt($('#' + g_pricelistItems[itemIndex].id).html(), 10);
	
	if (!currentValue)
		currentValue = 0;
	
	return newValue = currentValue + parseInt($('#pricelistQuantity').val(), 10);
}

function pricelistStoreItemData(itemIndex) {
	
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
    
    g_pricelistSelectedProduct.ItemIndex = itemIndex;
}