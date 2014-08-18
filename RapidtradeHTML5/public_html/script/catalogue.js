/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var catalogue = (function() {

    var ITEMS_PER_PAGE = 8;
    var ITEMS_PER_ROW = 2;

    var catalogueHTML = '';
    var currentPage = 0;
    var order = {};
    
    // Public
    
    return {
        
        init: function() {
            
            catalogueHTML = '';
            currentPage = 0;
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
        
        for (var i = 0; i < totalPages; ++i) {
            
            addHeader();
            addItems();
            addFooter();
        }
        
        showCatalogue();
    }
    
    function addHeader() {
        
        catalogueHTML += '<div class="header">--- HEADER ---</div>';         
    }
    
    function addFooter() {
        
        catalogueHTML += '<div class="footer">--- FOOTER ---</div><div class="page-break"></div>';        
    }    
    
    function addItems() {
        
        var currentIndex = currentPage++ *  ITEMS_PER_PAGE;
        
        catalogueHTML += '<table>';
        
        for (var i = 0; order.orderItems[currentIndex] && (i < ITEMS_PER_PAGE); ++i, ++currentIndex) {            
            
            if (i % ITEMS_PER_ROW === 0) {
            
                catalogueHTML += '<tr>';
            }
            
            var item = order.orderItems[currentIndex];
            
            catalogueHTML += '<td>';          
            
            catalogueHTML += '<img src="' + productdetailGetImageUrl(item.ProductID, 300, false) + '"><br>' +
                    '<table><tr><td>Item</td><td>' + item.ProductID + '</td></tr>' +
                    '<tr><td>Descr</td><td>' + item.Description  + '</td></tr>' +
                    '<tr><td>Pack Size</td><td>' + item.Unit  + '</td></tr>' +
                    '<tr><td>Price (Excl)</td><td>' + item.Nett  + '</td></tr></table>';
            
            catalogueHTML += '</td>';
            
            if (i % ITEMS_PER_ROW === ITEMS_PER_ROW - 1) {
            
                catalogueHTML += '</tr>';
            }
        } 
        
        catalogueHTML += '</table>';
    }
    
    function showCatalogue() {
        
        $('.printinvoiceContent').html(catalogueHTML);
    }
    
})();