/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var catalogue = (function() {

    var ITEMS_PER_PAGE = 6;
    var ITEMS_PER_ROW = 2;

    var catalogueHTML = '';
    var order = {};
    
    // Public
    
    return {
        
        init: function() {
            
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

            sessionStorage.setItem('lastPanelId', 'activityPanel');
            $.mobile.changePage('company.html');
        });
    }
    
    function fetch() {              
        
        var totalPages = Math.ceil(order.orderItems.length / ITEMS_PER_PAGE);        
        
        for (var i = 0; i < totalPages; addPage(i++, totalPages));
        
        showCatalogue();
    }
    
    function addPage(pageIndex, totalPages) {        
        
        catalogueHTML += '<div class="page' + (pageIndex < totalPages - 1 ? ' page-break' : '') + '"><div class="header"><img src="' + DaoOptions.getValue('QuoteHeader') + '" style="width:100%"></div>';
             
        var currentIndex = pageIndex *  ITEMS_PER_PAGE;
        
        catalogueHTML += '<div class="items"><table style="width:100%">';
        
        for (var i = 0; order.orderItems[currentIndex] && (i < ITEMS_PER_PAGE); ++i, ++currentIndex) {            
            
            if (i % ITEMS_PER_ROW === 0) {
            
                catalogueHTML += '<tr>';
            }
            
            var item = order.orderItems[currentIndex];
            
            catalogueHTML += '<td style="vertical-align: bottom;padding:10px 15px;">';          
            
            catalogueHTML += '<div style="width:300px;text-align:center;vertical-align:middle"><img src="' + productdetailGetImageUrl(item.ProductID, 160, false) + '" style="padding-bottom:20px"></div>' +
                    '<table><tr><td>Item</td><td>' + item.ProductID + '</td></tr>' +
                    '<tr><td>Descr</td><td>' + item.Description  + '</td></tr>' +
                    '<tr><td>Inn/Ctn Qty</td><td>' + (item.UserField02 || 'N/A')  + '</td></tr>' +
                    '<tr><td>Price (Excl)</td><td>$' + item.Nett  + '</td></tr>' +
                    '<tr><td>Bar Code</td><td>' + (item.Barcode || 'N/A')  + '</td></tr></table>';
            
            catalogueHTML += '</td>';
            
            if (i % ITEMS_PER_ROW === ITEMS_PER_ROW - 1) {
            
                catalogueHTML += '</tr>';
            }
        } 
        
        catalogueHTML += '</table></div>';        
        
        var footerImageURL = DaoOptions.getValue('QuoteFooter');
        catalogueHTML += '<div class="footer">' + (footerImageURL ? '<img src="' + footerImageURL + '" style="width:100%">' : '') + '</div></div>';
    }   
    
    function showCatalogue() {
        
        $('.printinvoiceContent').html(catalogueHTML);
    }
    
})();