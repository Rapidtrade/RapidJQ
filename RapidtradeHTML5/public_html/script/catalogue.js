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
            
            catalogueHTML += '<td style="vertical-align: bottom;padding:10px 15px;">';                      
            
            catalogueHTML += '<div style="width:' + Math.floor(700 / itemsPerRow) + 'px;text-align:center;vertical-align:middle"><img src="' + productdetailGetImageUrl(item.ProductID, 180, false) + '"></div>' +
                    '<table class="catalogueItemDataTable"><tr><td>Item</td><td>' + item.ProductID + '</td></tr>' +
                    '<tr><td>Descr</td><td>' + item.Description  + '</td></tr>' +
                    '<tr><td>Inn/Ctn Qty</td><td>' + (item.UserField02 || 'N/A')  + '</td></tr>' +
                    '<tr><td>Price (Excl)</td><td>$' + item.Nett  + '</td></tr>' +
                    '<tr><td>Bar Code</td><td>' + (item.BarCode || 'N/A')  + '</td></tr></table>';
            
            catalogueHTML += '</td>';
            
            if (i % itemsPerRow === itemsPerRow - 1) {
            
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