var g_advancedSearchListHtml = '';

var g_advancedSearchCategories = {};
g_advancedSearchCategories['advanced'] = [];
g_advancedSearchCategories['categories'] = [];

var g_advancedSearchBreadcrumbItems = {};
g_advancedSearchBreadcrumbItems['advanced'] = [];
g_advancedSearchBreadcrumbItems['categories'] = [];

var g_advancedSearchProducts = [];
var g_advancedSearchFilter = {};

var g_advancedSearchFetchProductRequestsNumber = 0;
var g_advancedSearchTotalProductsFetched = 0;
var g_advancedSearchType = '';
var g_advancedSearchAlphaBuilt = false;

function advancedSearchInit(searchType) {
	
	if (searchType) 
            g_advancedSearchType = searchType;
	
	if (DaoOptions.getValue('AdvSearchAlphabet','false') == 'false'){
		$('#alphabet').attr('class','invisible');
		$('#advancedSearchList').attr('style','margin-top:10px;');
	} else {
		$('#advancedSearchList').removeAttr('data-filter');
		$('#advancedSearchList').listview( 'refresh' );		
	}
	if ($('#pricelistPanel').is(':visible')) {
            $('#pricelistPanel').hide();	

            if (DaoOptions.getValue('LiveAdvanceSearch') && ('advanced' == searchType)) {

                $('#advancedSearchButton').hide();

            } else {

                $('#searchBarPanel').hide();
            }

            $('#advancedSearchPanel').show();
	}
//	if ($('#alphabet input').length < 2) {
//		alphaFilter.getInstance().init('#alphabet');
////		$('#alphabet').empty();
////		g_advancedSearchAlphaBuilt = false;
////		g_advancedSearchAlpha = '';
//	}
        
        $('#advancedSearchBackButton').toggleClass('invisible', ('advanced' == searchType) && advancedSearchIsTopLevel() && DaoOptions.getValue('LiveAdvanceSearch') != undefined);
	$('#advancedSearchBackButton .ui-btn-text').text(advancedSearchIsTopLevel() ? 'Basic Search' : 'Back');
	
	window.scrollTo(0, 0);
	

	$.mobile.showPageLoadingMsg();
	
	g_advancedSearchListHtml = '';
}


function advancedSearchResetStorage(){
	sessionStorage.removeItem("fromCategory");
	sessionStorage.removeItem("fromAdvanced");
	sessionStorage.removeItem("categoriesParentId");
	sessionStorage.removeItem("categoriesTip");
	sessionStorage.removeItem("categoriesLevel");
	sessionStorage.removeItem("advancedTip");
	sessionStorage.removeItem("advancedParentId");
	sessionStorage.removeItem("advancedLevel");
}

function advancedSearchFetchLevel(searchType) {
	
	advancedSearchInit(searchType);
		
	var dao = new Dao();	
	dao.indexsorted('ProductCategories2', advancedSearchGetItem('parentId'), 'index1','index3', 
			advancedSearchFetchLevelOnSuccessRead, 
			advancedSearchFetchLevelOnErrorRead, 
			advancedSearchFetchLevelOnComplete);

}

function advancedSearchFetchLevelOnErrorRead() {
	
	if ('advanced' == g_advancedSearchType) {

		sessionStorage.setItem('fromAdvanced', 'true');
		advancedSearchOnSearchButtonClicked();
		advancedSearchChangeLevel(-1);
		return;
	}
	
	var tip = advancedSearchGetItem('tip');
	var category = !tip || (tip == 'null') ? advancedSearchGetItem('parentId') : advancedSearchGetItem('tip');	
	sessionStorage.setItem('fromCategory', 'true');
	advancedSearchChangeLevel(-1);

	if (DaoOptions.getValue('MobileOnlinePricelist') == 'true') {
		sessionStorage.setItem('onlinePricelistCategory', category);
		advancedSearchShowOnlineProducts(category);
	} else {
		advancedSearchShowLocalProducts(category);
	}
}

function advancedSearchFetchLevelOnSuccessRead(productCategory) {
	
	if (productCategory.ta) {
		var imageUrl = g_url.replace('app.r', 'app1.r') + 'getimage.aspx?imagename=' + productCategory.ti + '&subfolder=' + g_currentUser().SupplierID + '&width=500&height=500';
		$('#imagePopup img').attr('src', imageUrl);
		
		if (DaoOptions.getValue('AllowAdvancedFilter') == 'true')
			$('#advancedSearchImageButton').show();
		
	} else if (DaoOptions.getValue('AllowAdvancedFilter') == 'true') {
		
		$('#advancedSearchImageButton').hide();
	}
	
	//advancedSearchBuildAlpha(productCategory.des);
	var firstChr = productCategory.des.substring(0,1).toUpperCase();
	g_advancedSearchListHtml += 
		'<li id="item' + firstChr  + '" ' + alphaFilter.getInstance().addClass(productCategory.des) + '">' + 	
		'	<a onclick="advancedSearchShowCategory(\'' + productCategory.c + '\',\'' + productCategory.ti + '\',\'' + productCategory.des +'\')">' + 
		'        <h3 class="ui-li-heading">' + productCategory.des + '</h3>' +
		'   </a>' +
		'</li>';
}

function advancedSearchFetchLevelLive() {
	
	advancedSearchInit('advanced');
	
	var level = advancedSearchCurrentLevel();
	
	var url = DaoOptions.getValue('LiveAdvanceSearch') + '?supplierid=' + g_currentUser().SupplierID + '&accountid=' + g_currentCompany().AccountID + 
	'&branchid=' + g_currentCompany().BranchID + '&level=' + level;
	
	var filter = '';
	
	switch (level) {
	
	case 1:
		
		if ($.trim($('#search').val()))
			advancedSearchSetItem('lastLiveSearch', $('#search').val());
		else	
			$('#search').val(advancedSearchGetItem('lastLiveSearch'));
		
		
		filter = $('#search').val();
		break;
		
	case 3:
		filter = advancedSearchGetItem('description');
		break;
		
	case 4:
		filter = advancedSearchGetItem('modelCode') + ',' + advancedSearchGetItem('linkCode');
		break;				
	}
        
	
	if (advancedSearchCurrentLevel() != '2') {
		
            if (!filter)
                return;
                
            if (advancedSearchCurrentLevel() < 4)
                filter = encodeURIComponent(filter);

            url += '&filter=' + filter;
	}		
	
	console.log(url);
	
	$.mobile.showPageLoadingMsg();
	
	g_ajaxget(url, advancedSearchFetchLevelLiveOnSuccess, advancedSearchFetchLevelLiveOnError);
}

function advancedSearchFetchLevelLiveOnSuccess(json) {
	
	console.log(json);

	g_advancedSearchListHtml = '';
	
	$.each(json, function(index, object) {
		
		if (advancedSearchCurrentLevel() < 4) {
		
			var modelCode = (advancedSearchCurrentLevel() == 1 ? object.ModelCode : '');			
			var linkCode = (advancedSearchCurrentLevel() == 3 ? object.Link : '');
			
			g_advancedSearchListHtml += 
				'<li>' + 	
				'	<a onclick="advancedSearchFetchNextLevelLive(\'' + modelCode + '\', \'' + object.des + '\', \'' + linkCode + '\')">' + 
				'        <h3 class="ui-li-heading">' + object.des + '</h3>' +
				'   </a>' +
				'</li>';
			
		} else {
			
			g_advancedSearchProducts.push(object);
		}
	});
	
	
	if (advancedSearchCurrentLevel() == 4) {
		
		console.log(g_advancedSearchProducts);
		
		sessionStorage.setItem('fromAdvanced', true);
		advancedSearchCurrentLevel(3);
		advancedSearchShowOnlineProducts();
		return;
	}
	
	$('#advancedSearchList').html(g_advancedSearchListHtml); 
	$('#advancedSearchList').listview('refresh');

	advancedSearchSetBreadcrumb(advancedSearchCurrentLevel() - 1);
	
	$.mobile.hidePageLoadingMsg();
          
        $('#advancedSearchInfoDiv').toggle((advancedSearchCurrentLevel() == 1) && !$('#advancedSearchList li').length);
            
}

function advancedSearchFetchLevelLiveOnError() {
	
	$.mobile.hidePageLoadingMsg();
}


function advancedSearchFetchNextLevelLive(modelCode, description, linkCode) {
	
	g_advancedSearchBreadcrumbItems[g_advancedSearchType][advancedSearchCurrentLevel() - 1] = description;
	
	if (modelCode)
		advancedSearchSetItem('modelCode', modelCode);
	
	if (advancedSearchCurrentLevel() == 2)
		advancedSearchSetItem('description', description);
	
	if (linkCode)
		advancedSearchSetItem('linkCode', linkCode);
	
	advancedSearchCurrentLevel(advancedSearchCurrentLevel() + 1);
	advancedSearchFetchLevelLive();
}

function advancedSearchFetchPreviousLevelLive() {
	
	advancedSearchCurrentLevel(advancedSearchCurrentLevel() - 1);
	advancedSearchFetchLevelLive();	
}

function advancedSearchCurrentLevel(level) {

	if (level)
		sessionStorage.setItem('advancedLevel', level);
	else
		return Number(sessionStorage.getItem('advancedLevel'));
}


function advancedSearchFetchLevelOnComplete() {
	
//	if (DaoOptions.getValue('AdvSearchAlphabet','false') == 'true') alphaFilter.getInstance().HTML('#alphabet', '#advancedSearchList');
	//advancedSearchShowAlpha();
	
	if (g_advancedSearchListHtml) {
		
		$('#advancedSearchList').html(g_advancedSearchListHtml);
		$('#advancedSearchList').listview('refresh');
		
		var level = parseInt(advancedSearchGetItem('level'), 10);	
		$('#levelCaption').text(('advanced' == g_advancedSearchType) ? DaoOptions.getValue('AdvancedLabel' + level) : '');
		advancedSearchSetBreadcrumb(level);

	}
	
	if ($('#advancedSearchPanel').is(':visible'))
		$.mobile.hidePageLoadingMsg();
}

function advancedSearchSetBreadcrumb(level) {
	
	var breadcrumbText = level > 0 ? g_advancedSearchBreadcrumbItems[g_advancedSearchType][0] : '';
	
	for (var i = 1; i < level; ++i)
		breadcrumbText += ' > ' + g_advancedSearchBreadcrumbItems[g_advancedSearchType][i];
	
	$('#breadcrumb').text(breadcrumbText);
}

/*
function advancedSearchShowAlpha(){
	try {
		if (g_advancedSearchAlphaBuilt) return;
		g_advancedSearchAlpha = g_advancedSearchAlpha + '<input class="rb" id="radioall" onclick="advancedSearchFilter(\'*\')" name="" value="*" type="radio"><label for="radioall">*</label>';
		g_append('#alphabet ', g_advancedSearchAlpha);
		$('#alphabet').trigger('create');
		g_advancedSearchAlphaBuilt = true;
	} catch (err){
		console.log(err.message);
	}	
}


function advancedSearchFilter(letter){
	if (letter == '*') {
		$("#advancedSearchList li").show();
	} else {
		$("#advancedSearchList").removeAttr('data-autodividers');
		$("#advancedSearchList li").hide();
		$('#advancedSearchList #item' + letter).show();
		$('#advancedSearchList').listview('refresh');		
	}
}
*/

function advancedSearchShowCategory(categoryId, tip, description) {
	var level = parseInt(advancedSearchGetItem('level'), 10);	
	var categoryInfo = {}; 
	
	categoryInfo.id = advancedSearchGetItem('parentId');
	categoryInfo.tip = advancedSearchGetItem('tip');
	g_advancedSearchCategories[g_advancedSearchType][level] = categoryInfo;	
	g_advancedSearchBreadcrumbItems[g_advancedSearchType][level] = description;
	advancedSearchSetItem('level', ++level);
	advancedSearchSetItem('parentId', categoryId);
	advancedSearchSetItem('tip', tip);
	advancedSearchFetchLevel();
}

function advancedSearchOnBackButtonClicked() {
	
	if (advancedSearchIsTopLevel()) {
		
		$('#pricelistQuantityDiv').hide();
		$('.categorySearchWidget').hide();
		$('#advancedSearchPanel').hide();		
		$('.basicSearchWidget').show();
		$('#pricelistPanel, #searchBarPanel').show();
		
		overlayHighlightMenuItem('#basic');		
		pricelistShowPricelist();
		
	} else {
		
		if (DaoOptions.getValue('LiveAdvanceSearch') && ('advanced' == g_advancedSearchType)) {
		
			advancedSearchFetchPreviousLevelLive();
			return;
			
		} 
		
		advancedSearchChangeLevel(-1);
		advancedSearchFetchLevel();
	}	
}

// increment can be +1 or -1
function advancedSearchChangeLevel(increment) {

	var level = parseInt(advancedSearchGetItem('level'), 10) + increment;
	advancedSearchSetItem('level', level);
	advancedSearchSetItem('parentId', g_advancedSearchCategories[g_advancedSearchType][level].id);
	advancedSearchSetItem('tip', g_advancedSearchCategories[g_advancedSearchType][level].tip);
}

function advancedSearchOnSearchButtonClicked() {
	
	$.mobile.showPageLoadingMsg();
	
	sessionStorage.setItem('fromAdvanced', 'true');
	
	if (DaoOptions.getValue('MobileOnlinePricelist') == 'true') {
		
		sessionStorage.setItem('onlinePricelistCategory',  advancedSearchGetItem('parentId'));
		advancedSearchShowOnlineProducts();
		return;
	}
	
	g_advancedSearchFilter = {};
	$.each($('#filterForm').serializeArray(), function(index, field) {
		
		g_advancedSearchFilter[field.name] = $.trim(field.value);
	});
	
	g_advancedSearchProducts = [];
	
	if (parseInt(advancedSearchGetItem('level'), 10) >=  parseInt(DaoOptions.getValue('AdvSearchMinLevel') || 0, 10)) {
		
		g_advancedSearchFetchProductRequestsNumber = 0;
		g_advancedSearchTotalProductsFetched = 0;
		advancedSearchFetchCategories(advancedSearchGetItem('parentId'));	
		
	} else {
		
		advancedSearchShowOnlineProducts();
	}
}


function advancedSearchFetchCategories(parentId) {
	
	var dao = new Dao();	
	dao.index('ProductCategories2', parentId, 'p', advancedSearchFetchCategoriesOnSuccess, advancedSearchFetchCategoriesOnError);
}

function advancedSearchFetchCategoriesOnSuccess(category) {
	
	var categoryId = ('categories' == g_advancedSearchType) ? (category.ti || category.c) : category.c;
	
	advancedSearchFetchCategories(categoryId);
}

function advancedSearchFetchCategoriesOnError(categoryId) {
	
	advancedSearchFetchCategoryProducts(categoryId);
}

function advancedSearchFetchCategoryProducts(categoryId) {
	
	var onSuccess = function(json) {
		
		var categories = json.c.split(',');
		
		for (var i = 0; i < categories.length; i++) {
			
			if (categories[i] == categoryId) {
				
				advancedSearchFetchProduct(json.p);
				break;
			}
				
		}
	};

	var dao = new Dao();
	dao.cursor('ProductCategory2Link', undefined, undefined, onSuccess);
}

function advancedSearchFetchProduct(productId) {	
	
	console.log('Request ' + ++g_advancedSearchFetchProductRequestsNumber + ' ' + Date.now());
	
	var dao = new Dao();
	dao.get('Pricelists', productId + g_currentCompany().Pricelist, advancedSearchFetchProductOnSuccess, advancedSearchFetchProductOnError);
}

function advancedSearchFetchProductOnSuccess(product) {
	
	window.setTimeout(function() {
		advancedSearchCacheProduct(product);
	}, 500);
}

function advancedSearchFetchProductOnError(error) {
	
	console.log(error);
	window.setTimeout(advancedSearchCacheProduct, 500);
}


function advancedSearchCacheProduct(product) {
	
	console.log('Fetched ' + ++g_advancedSearchTotalProductsFetched + ' ' + Date.now());
	
	if (product) 
            g_advancedSearchProducts.push(product);
	
	if (g_advancedSearchTotalProductsFetched == g_advancedSearchFetchProductRequestsNumber)
		advancedSearchShowOnlineProducts();
}

function advancedSearchShowOnlineProducts() {
	
	sessionStorage.removeItem('cachePricelist');
	sessionStorage.removeItem('pricelistsearchtxt');
	$('#advancedSearchPanel').hide();
	$('#pricelistPanel, #searchBarPanel').show();
	
    g_pricelistItemsOnPage = 0;
    g_pricelistCurrentPricelistPage = 1;
    
    $('#search').val('');
    $('#search').attr('placeholder', g_companyPageTranslation.translateText('Search for products'));
    
	pricelistOnPageShow();
}

function advancedSearchShowLocalProducts(category) {
	
	sessionStorage.removeItem('cachePricelist');
	$('#advancedSearchPanel').hide();
	sessionStorage.setItem('advancedsearch',category);
	$('#pricelistPanel, #searchBarPanel').show();
	g_numItemsPerPage = 150;
	
    g_pricelistItemsOnPage = 0;
    g_pricelistCurrentPricelistPage = 1;
	
    $('#search').val('');
    
	//pricelistOnPageShow();
    pricelistCategorySearch(category);
}

String.prototype.capitalise = function() {
	
    return this.charAt(0).toUpperCase() + this.slice(1);
};

function advancedSearchSetItem(name, value) {
	
	sessionStorage.setItem(g_advancedSearchType + name.capitalise(), value);
}

function advancedSearchGetItem(name) {
	
	return sessionStorage.getItem(g_advancedSearchType + name.capitalise());
}

function advancedSearchIsTopLevel() {
	
	if (DaoOptions.getValue('LiveAdvanceSearch') && ('advanced' == g_advancedSearchType))
		return (advancedSearchCurrentLevel() == 1);
	
	return (advancedSearchGetItem('parentId') == 'ADVANCED') ||  (advancedSearchGetItem('parentId') == 'PC');
}