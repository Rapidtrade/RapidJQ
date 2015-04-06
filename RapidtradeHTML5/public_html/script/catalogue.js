/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var catalogue = (function() {

    var itemsPerPage = 0;
    var itemsPerRow = 0;
    var itemImageSize = 0;

    var catalogueHTML = '';
    var order = {};
    
    // Public
    
    /*
     * catalogue.init({itemsPerPage:number, itemsPerRow:number});
     */    
    
    return {        
        
        init: function(settings) {
            
            itemsPerPage = settings.itemsPerPage;
            itemsPerRow = settings.itemsPerRow;
            itemImageSize = 150;
            
            catalogueHTML = '';
            order = JSON.parse(sessionStorage.getItem('currentOrder'));
            
            if (order.UserField02) {
                try {
                    itemsPerPage = parseInt(order.UserField02, 10);
                    switch (itemsPerPage) {
                        case 1: 
                            itemsPerRow = 1;                            
                            itemImageSize = 500;
                            break;                           
                        case 2:
                            itemsPerRow = 1;                            
                            itemImageSize = 280;
                            break;
                        case 4:
                            itemsPerRow = 2;
                            itemImageSize = 250;
                            break;
                        default:
                            itemsPerRow = 3;
                            itemImageSize = 150;
                    }   
                } catch (e) {}
            }
            
            bind();
            if (/*true*/  DaoOptions.getValue('AllowEditCatalogueHeader','false')) {
                if (!$('.catalogueContent').hasClass('invisible')) {
                    $('.catalogueContent').addClass('invisible');
                }
                if ($('.catalogueHeaderEditor').hasClass('invisible')) {
                    $('.catalogueHeaderEditor').removeClass('invisible');
                }
                if (!$('.ui-btn-left').hasClass('ui-disabled')) {
                    $('.ui-btn-left').addClass('ui-disabled');
                }
                $('#catalogueHeadT1').val(DaoOptions.getValue('CatalogueHeaderT1','Title'));
                $('#catalogueHeadT2').val(DaoOptions.getValue('CatalogueHeaderT2','Title 2'));
                $('#catalogueHeadT3').val(DaoOptions.getValue('CatalogueHeaderT3','Title 3'));
                
                $('#catalogueHeaderApplyButton').off().on('click', function() {
                    applyChangesOnHeader();
                });
                
                $('#catalogueHeadImageFile').off().on('change', function(evt){
                    var files = evt.target.files; // FileList object

                    // files is a FileList of File objects. List some properties.
                    var output = [];
                    for (var i = 0, f; f = files[i]; i++) {
                        if (!f.type.match('image.*')) {
                            g_alert('You must select image file.');
                            var tmpInpit = $('#catalogueHeadImageFile');
                            tmpInpit.replaceWith(tmpInpit = tmpInpit.clone(true));
                            return;
                        }
                        var reader = new FileReader();
                        // Closure to capture the file information.
                        reader.onload = (function(theFile) {
                          return function(e) {
                            // Render thumbnail.
                            localStorage.setItem('catalogueLogoImageData', e.target.result);
                             applyChangesOnHeader();                 
                            
                          };
                        })(f);

                        // Read in the image file as a data URL.
                        reader.readAsDataURL(f);
                    }
                    
                });
                
                $('#catalogueHeaderOKButton').off().on('click', function() {
                    if ($('.catalogueContent').hasClass('invisible')) {
                        $('.catalogueContent').removeClass('invisible');
                    }
                    if (!$('.catalogueHeaderEditor').hasClass('invisible')) {
                        $('.catalogueHeaderEditor').addClass('invisible');
                    }
                    if ($('.ui-btn-left').hasClass('ui-disabled')) {
                        $('.ui-btn-left').removeClass('ui-disabled');
                    }
                    fetch();
                });
                applyChangesOnHeader();
            } else {
                fetch();
            }
        }
    };
    
    // Private
    
    function bind() {
        
        $('.ui-btn-left').off().on('click', function() {
            
            g_print('#cataloguePage');
        });
        
        $('.printinvoiceHeader .ui-btn-right').off().on('click', function() {

            if (sessionStorage.getItem('invoiceContinue') === 'orderdetails.html') {
                
                $.mobile.changePage('orderdetails.html');
                
            } else {
                
                sessionStorage.setItem('lastPanelId', 'activityPanel');
                $.mobile.changePage('company.html');
            }
        });
    }
    
    function fetch() {              
        
        var totalPages = Math.ceil(order.orderItems.length / itemsPerPage);        
        
        for (var i = 0; i < totalPages; addPage(i++, totalPages));
        
        showCatalogue();
    }
    
    function addPage(pageIndex, totalPages) {        
        
        catalogueHTML += '<div class="page' + (pageIndex < totalPages - 1 ? ' page-break' : '') + '" style="position:relaive; height: 100%;"><div class="header">' + 
                ($('#catalogueHeadPreview').html().trim() ? $('#catalogueHeadPreview').html() : '<img src="' + DaoOptions.getValue('QuoteHeader') + '" style="width:100%">' ) + '</div>';
             
        var currentIndex = pageIndex *  itemsPerPage;
        
        catalogueHTML += '<div class="items"><table style="width:100%">';
        
        for (var i = 0; order.orderItems[currentIndex] && (i < itemsPerPage); ++i, ++currentIndex) {            
            
            if (i % itemsPerRow === 0) {
            
                catalogueHTML += '<tr>';
            }
            
            var item = order.orderItems[currentIndex];
            
            catalogueHTML += '<td style="vertical-align: top;padding:10px 10px;">';                      
            
            catalogueHTML += '<div style="width:' + Math.floor(730 / itemsPerRow) + 'px;text-align:center;vertical-align:middle;height:' + (itemImageSize + 10) + 'px;display:table-cell"><img src="' + productdetailGetImageUrl(item.ProductID, itemImageSize, false) + '"></div>' +
                    '<table class="catalogueItemDataTable' + itemsPerPage + '" style="table-layout: fixed; width:' +  Math.floor(730 / itemsPerRow) + 'px"><tr><td width="25%">Item</td><td>' + item.ProductID + '</td></tr>' +
                    '<tr><td width="25%">Descr</td><td style="white-space: nowrap;">' + item.Description  + '</td></tr>' +
                    //'<tr><td>Inn/Ctn Qty</td><td>' + (item.CategoryName || 'N/A')  + '</td></tr>' +
                    '<tr><td width="25%">Inn/Ctn Qty</td><td>' + (item.UserField03 || '-')  + '/' + (item.UserField04 || '-') + '</td></tr>' +
                    '<tr><td width="25%">Price (Excl)</td><td>$' + ( item.RepChangedPrice ? ('' + item.RepNett) : ('' + item.Nett))  + '</td></tr>';
            
            if (order.UserField01 && order.UserField01 === 'Yes') {
                catalogueHTML +=  '<tr align="center"><td colspan="2"><span class="catalogueItemBarCodeW' + itemsPerPage + '"  ><span class="catInnerBC" >' + (item.UserField01 || 'N/A')  + '</span></span>' +
                        '<span class="catalogueItemBarCodeW' + itemsPerPage + '"  ><span class="catOuterBC" >' + (item.UserField02 || 'N/A')  + '</span></span></td></tr>' + 
                        '</table>'; //<table width="100%"><tr align="center" style="font-size:8px;"><td width="49%">' + (item.UserField01 || 'N/A').trim() + '</td><td width="49%">' + (item.UserField02 || 'N/A').trim() + '</td></tr> </table>';
            } else {
                catalogueHTML +=  '<tr><td width="25%">Bar Code</td><td>' + (item.Barcode || 'N/A')  + '</td></tr></table>';
            }
            
            catalogueHTML += '</td>';
            
            if (i % itemsPerRow === itemsPerRow - 1) {
            
                catalogueHTML += '</tr>';
            }
        } 
        
        catalogueHTML += '</table></div>';        
        
        //catalogueHTML += '<div class="pageNumber">' + 'Page ' + (+pageIndex + 1) + '</div>';
        
        var footerImageURL = DaoOptions.getValue('QuoteFooter');
        catalogueHTML += '<div class="footer" style="width:95%;text-align: right;"><div >' + 'Page ' + (+pageIndex + 1) + '</div>' + (footerImageURL ? '<img src="' + footerImageURL + '" style="width: 100%;">' : '') + '</div></div>';
    }   
    
    function showCatalogue() {
        
        $('.catalogueContent').html(catalogueHTML);
        
        var barcodeDivs = $('.catInnerBC, .catOuterBC');
        $.each(barcodeDivs, function(index, bcDiv) {
            var currentCode = bcDiv.innerText;
            if (currentCode !== 'N/A') {
                //bcDiv.innerText = '';
                //bcDiv.innerHtml = '';
                var settings = {
                    addQuietZone: "0",
                    barHeight: "35",
                    barWidth: "1",
                    bgColor: "#FFFFFF",
                    color: "#000000",
                    moduleSize: "3",
                    output: "bmp",
                    showHRI: true
                };
                $(bcDiv).barcode(currentCode, "code128", settings);
                //$(bcDiv).children().css('width', '118px');
                //$(bcDiv).children().css('height', '35px');
                $(bcDiv).children().addClass('catalogueItemBarCode' + itemsPerPage);
                $(bcDiv).append('<p style="font-size:8px;">' + currentCode + '</p>');
            } else {
                //bcDiv.innerText = '';
                $(bcDiv).css('color', 'red');
            }
                
        });
    }
    
    function applyChangesOnHeader() {
        var headerHTML = '<div style="width: 100%; height: 111px; background-color: ' + $('#catalogueHeadBGColor').val() + '; display: inline-block;">' + 
				'<div style="height: 111px; width: 111px; padding: 5px; float: left; display: inline-block;">' +
					'<img src="' + localStorage.getItem('catalogueLogoImageData') + '" style="width: 101px; height: 101px;"/>' +
				'</div>' +
				'<div style="width:620px; float: left; vertical-align: middle;display: inline-block; padding: 5px; text-align:center; font-family: \'Trebuchet MS\'; color: ' + $('#catalogueHeadFontColor').val() + ';">' +
					'<h1 style="margin: 5px 5px 5px 5px; font-size: ' + $('#catalogueHeadT1FontSize').val() + 'px; font-family: ' + $('#catalogueHeadT1Font').val() + ';">' + $('#catalogueHeadT1').val().replace(/ /g,'&nbsp;') + '</h1>' + 
					'<h4 style="margin: 5px 5px 5px 5px; font-size: ' + $('#catalogueHeadT2FontSize').val() + 'px; font-family: ' + $('#catalogueHeadT2Font').val() + ';">' + $('#catalogueHeadT2').val().replace(/ /g,'&nbsp;') + '</h4>' +
					'<p style="margin: 5px 20px 0px 20px; font-size: ' + $('#catalogueHeadT3FontSize').val() + 'px; font-family: ' + $('#catalogueHeadT3Font').val() + ';">' + $('#catalogueHeadT3').val().replace(/ /g,'&nbsp;') + '</p>' +
				'</div>' +
			'</div>'; /* +
			<div style="width: 100%; ">
				<img src="header_bottom.png" style="width: 100%;"/>
			</div>
        '</div>';*/
        
        $('#catalogueHeadPreview').html(headerHTML);
    }
    
})();