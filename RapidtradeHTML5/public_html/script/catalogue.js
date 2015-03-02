/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var catalogue = (function() {

    var itemsPerPage = 0;
    var itemsPerRow = 0;

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
            
            catalogueHTML = '';
            order = JSON.parse(sessionStorage.getItem('currentOrder'));
            
            bind();
            fetch();
        }
    };
    
    // Private
    
    function bind() {
        
        $('.ui-btn-left').off().on('click', function() {
            
            g_print('#cataloguePage');
        });
        
        $('.ui-btn-right').off().on('click', function() {

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
        
        catalogueHTML += '<div class="page' + (pageIndex < totalPages - 1 ? ' page-break' : '') + '"><div class="header"><img src="' + DaoOptions.getValue('QuoteHeader') + '" style="width:100%"></div>';
             
        var currentIndex = pageIndex *  itemsPerPage;
        
        catalogueHTML += '<div class="items"><table style="width:100%">';
        
        for (var i = 0; order.orderItems[currentIndex] && (i < itemsPerPage); ++i, ++currentIndex) {            
            
            if (i % itemsPerRow === 0) {
            
                catalogueHTML += '<tr>';
            }
            
            var item = order.orderItems[currentIndex];
            
            catalogueHTML += '<td style="vertical-align: top;padding:10px 10px;">';                      
            
            catalogueHTML += '<div style="width:' + Math.floor(730 / itemsPerRow) + 'px;text-align:center;vertical-align:middle;height:190px;display:table-cell"><img src="' + productdetailGetImageUrl(item.ProductID, 180, false) + '"></div>' +
                    '<table class="catalogueItemDataTable" style="width:' +  Math.floor(730 / itemsPerRow) + 'px"><tr><td>Item</td><td>' + item.ProductID + '</td></tr>' +
                    '<tr><td>Descr</td><td>' + item.Description  + '</td></tr>' +
                    //'<tr><td>Inn/Ctn Qty</td><td>' + (item.CategoryName || 'N/A')  + '</td></tr>' +
                    '<tr><td>Inn/Ctn Qty</td><td>' + (item.UserField03 || '-')  + '/' + (item.UserField04 || '-') + '</td></tr>' +
                    '<tr><td>Price (Excl)</td><td>$' + item.Nett  + '</td></tr>';
            
            if (order.UserField01 && order.UserField01 === 'Yes') {
                catalogueHTML +=  '</table><div class="catInnerBC" style="float:left;">' + (item.UserField01 || 'N/A')  + '</div>' +
                        '<div class="catOuterBC" style="float:left;">' + (item.UserField02 || 'N/A')  + '</div>';
            } else {
                catalogueHTML +=  '<tr><td>Bar Code</td><td>' + (item.Barcode || 'N/A')  + '</td></tr></table>';
            }
            
            catalogueHTML += '</td>';
            
            if (i % itemsPerRow === itemsPerRow - 1) {
            
                catalogueHTML += '</tr>';
            }
        } 
        
        catalogueHTML += '</table></div>';        
        
        catalogueHTML += '<div class="pageNumber">' + 'Page ' + (+pageIndex + 1) + '</div>';
        
        var footerImageURL = DaoOptions.getValue('QuoteFooter');
        catalogueHTML += '<div class="footer">' + (footerImageURL ? '<img src="' + footerImageURL + '" style="width:100%">' : '') + '</div></div>';
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
                    addQuietZone: "1",
                    barHeight: "50",
                    barWidth: "1",
                    bgColor: "#FFFFFF",
                    color: "#000000",
                    moduleSize: "5",
                    output: "css"
                };
                $(bcDiv).barcode(currentCode, "code128", settings);
            }
                
        });
    }
    
})();